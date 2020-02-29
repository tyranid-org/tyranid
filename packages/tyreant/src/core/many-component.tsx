import * as React from 'react';

import { observer } from 'mobx-react';
import { autorun, observable } from 'mobx';

import {
  Tyr,
  TyrSortDirection,
  getFinder,
  Filter,
  TyrFieldLaxProps
} from '../tyreant';
import {
  TyrComponentProps,
  TyrComponentState,
  TyrComponent
} from './component';
import { TyrFieldProps } from './field';
import { message } from 'antd';
import { getFilter } from '../type';
import { tyreant } from '../tyreant';

export const DEFAULT_PAGE_SIZE = 20;

export interface TyrManyComponentProps<D extends Tyr.Document = Tyr.Document>
  extends TyrComponentProps<D> {
  // QUERYING
  query?: Tyr.MongoQuery | (() => Promise<Tyr.MongoQuery> | Tyr.MongoQuery);
  documents?: D[] & { count?: number };

  // FILTERING
  notifyFilterExists?: (exists: boolean) => void;

  // SORTING
  notifySortSet?: (columnName?: string, order?: TyrSortDirection) => void;

  // PAGINATION
  pageSize?: number; // a.k.a. limit,
  pageSizeOptions?: string[];
  showSizeChanger?: boolean;
  showTotal?: (total: number, range: [number, number]) => React.ReactNode;

  // URL ROUTING
  route?: string;
}

export interface TyrManyComponentState<D extends Tyr.Document = Tyr.Document>
  extends TyrComponentState<D> {}

/**
 * A TyrComponent represents a react component that contains documents.  Examples
 * are TyrTable and TyrForm.
 */
@observer
export class TyrManyComponent<
  D extends Tyr.Document = Tyr.Document,
  Props extends TyrManyComponentProps<D> = TyrManyComponentProps<D>,
  State extends TyrManyComponentState<D> = TyrManyComponentState<D>
> extends TyrComponent<D, Props, State> {
  canMultiple = true;
  hasPaging = true;

  constructor(props: Props, state: State) {
    super(props, state);

    const { documents } = this.props;
    if (documents) this.documents = documents!;
  }

  componentDidMount() {
    super.componentDidMount();

    const { documents, query } = this.props;

    if (documents && query) {
      // we need to know the query even for in-memory tables because when we run an csv export we need to query the same rows
      this.findOpts = { query };
    }

    this.setDefaultSort();
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    this.cancelAutorun && this.cancelAutorun();
  }

  /*
   * * * QUERYING
   */

  /**
   * "local" means that the data displayed in the table is passed in and we don't do a find() for it
   */
  get isLocal() {
    return !!this.props.documents;
  }

  async requery() {
    if (this.isLocal) this.refresh();
    else this.findAll();
  }

  async buildFindOpts() {
    const { query: baseQuery } = this.props;
    const { searchValues, sortDirections } = this;

    const query = {
      ...(typeof baseQuery === 'function' ? await baseQuery() : baseQuery)
    };

    const sort: { [key: string]: number } = {};

    const opts: any /* Tyr.Options_Find */ = {
      query,
      count: true,
      sort
    };

    if (this.hasPaging) {
      const { skip, limit } = this;

      opts.skip = skip;
      opts.limit = limit;
    }

    for (const fieldProps of this.fields) {
      const { field } = fieldProps;

      if (!field) continue;

      const { namePath } = field;
      const finder = namePath && getFinder(namePath),
        pathName = namePath.name,
        searchValue = searchValues[pathName],
        sortDirection = sortDirections[pathName];

      if (finder) finder(namePath!, opts, searchValue);

      if (sortDirection) sort[pathName!] = sortDirection === 'ascend' ? 1 : -1;
    }

    this.findOpts = opts;
  }

  async findAll() {
    const { collection } = this.props;

    try {
      this.loading = true;

      await this.buildFindOpts();

      const docs = await collection!.findAll(this.findOpts);

      this.count = docs.count!;
      this.documents = docs;

      await this.postFind();

      this.loading = false;
    } catch (err) {
      message.error(err.message);
    }
  }

  async postFind() {}

  async execute() {
    if (this.props.route) {
      tyreant.router.go({
        route: this.props.route,
        query: this.getUrlQuery()
      });
    } else {
      if (this.mounted) {
        if (this.isLocal) {
          this.setSortedDocuments(this.documents.slice());
          this.refresh();
        } else {
          this.findAll();
        }
      }
    }
  }

  /*
   * * * FILTERS
   */

  /**
   * Note that these search values are the *live* search values.  If your control wants to keep an intermediate copy of the
   * search value while it is being edited in the search control, it needs to keep that copy locally.
   */
  @observable
  searchValues: {
    [pathName: string]: any;
  } = {};

  filters: { [path: string]: ReturnType<Filter> | undefined } = {};
  getFilter(props: TyrFieldProps) {
    const filterable = {
      searchValues: this.searchValues,
      onSearch: () => {
        this.skip = 0;
        this.execute();
      },
      localSearch: this.isLocal,
      localDocuments: this.documents
    };

    const { namePath: path } = props.field!;
    const pathName = path.name;
    const existingFilter = this.filters[pathName];
    if (existingFilter) return existingFilter;

    const filter = (path && getFilter(filterable, props)) || {};
    this.filters[pathName] = filter;
    return filter;
  }

  /*
   * * * SORTING
   */

  sortDirections: { [pathName: string]: TyrSortDirection } = {};

  resetFiltersAndSort = () => {
    const { notifyFilterExists, notifySortSet } = this.props;
    const { searchValues } = this;
    for (const key of Object.keys(searchValues)) delete searchValues[key];

    this.setDefaultSort();
    this.setSortedDocuments(this.documents.slice());
    this.setState({});

    notifyFilterExists && notifyFilterExists(false);

    if (notifySortSet) {
      const sortColumn = this.fields.find(column => !!column.defaultSort);
      notifySortSet(sortColumn?.field?.name, sortColumn?.defaultSort);
    }
  };

  setDefaultSort() {
    const sortColumn = this.fields.find(column => !!column.defaultSort);
    const sortName = sortColumn?.field?.name;

    if (sortName) this.sortDirections[sortName] = sortColumn!.defaultSort!;
  }

  // Sort the documents according to the current sort
  //
  // We need to do this so that when we enter editing mode
  // and disable sorting, the natural sort of the rows is
  // not any different than what the sort currently is.
  setSortedDocuments = (docs: D[]) => {
    let documents = docs;
    let sortColumn: TyrFieldProps | undefined;

    let sortColumnName: string | null = null;

    for (const name in this.sortDirections) {
      if (this.sortDirections[name] !== undefined) {
        sortColumnName = name;
        break;
      }
    }

    // Find column
    if (sortColumnName) {
      sortColumn = this.fields.find(f => f.field?.name === sortColumnName);
    }

    if (sortColumn) {
      let field: Tyr.FieldInstance | undefined;
      let pathName: string | undefined;

      if (
        sortColumn.field &&
        (sortColumn.field as Tyr.FieldInstance).collection
      ) {
        field = sortColumn.field as Tyr.FieldInstance;
        pathName = field.path;
      } else {
        pathName = sortColumn.field?.name;
        field = pathName ? this.collection.paths[pathName] : undefined;
      }

      const np = field ? field.namePath : undefined;

      docs.sort(
        sortColumn.sortComparator
          ? sortColumn.sortComparator
          : (a: Tyr.Document, b: Tyr.Document) =>
              np ? field!.type.compare(field!, np.get(a), np.get(b)) : 0
      );

      if (pathName && this.sortDirections[pathName] === 'descend')
        docs.reverse();

      documents = docs;
    }

    this.documents = documents;
    this.count = documents.length;
  };

  /*
   * * * PAGINATION
   */

  defaultPageSize: number = (this.props.pageSize ||
    DEFAULT_PAGE_SIZE) as number;

  skip?: number;
  limit: number = this.defaultPageSize;

  count = this.props.documents?.length || 0;

  private paginationItemRenderer = (
    page: number,
    type: 'page' | 'prev' | 'next' | 'jump-prev' | 'jump-next',
    originalElement: React.ReactElement<HTMLElement>
  ) => {
    if (type === 'prev') return <a>Previous</a>;
    if (type === 'next') return <a>Next</a>;
    return originalElement;
  };

  pagination = () => {
    if (!this.limit) return false;

    const { showSizeChanger, pageSizeOptions, showTotal } = this.props;

    const { skip = 0, limit } = this;
    const totalCount = this.count || 0;

    //const morePages = totalCount > limit;

    return {
      current: Math.floor(skip / limit) + 1,
      //defaultCurrent: Math.floor(skip / limit) + 1,
      total: totalCount,
      defaultPageSize: limit,
      pageSize: limit,
      size: 'default',
      itemRender: this.paginationItemRenderer,
      showSizeChanger: showSizeChanger === false ? false : true,
      pageSizeOptions,
      hideOnSinglePage: true,
      showTotal
    };
  };

  /*
   * * * URL ROUTING
   */

  fromUrlQuery(query: { [name: string]: string }) {
    this.skip = 0;
    this.limit = this.defaultPageSize;
    Tyr.clear(this.searchValues);
    let sortFound = false;

    for (const name in query) {
      const value = query[name];

      switch (name) {
        case 'skip':
        case 'limit':
          this[name] = parseInt(value, 10);
          break;
        default: {
          const dot = value.indexOf('.');
          let sortDirection: TyrSortDirection, searchValue: string | undefined;

          if (dot !== -1) {
            sortDirection = value.substring(0, dot) as TyrSortDirection;
            searchValue = value.substring(dot + 1);
          } else {
            sortDirection = value as TyrSortDirection;
          }

          this.sortDirections[name] = sortDirection || undefined;

          if (searchValue) {
            // TODO:  we need to know the Field here because of it is a link or array of links we need to split the search value on '.'
            const canBeArray = searchValue.indexOf(',') >= 0; // this is not right -- need the Field
            this.searchValues[name] = canBeArray
              ? searchValue.split(',')
              : searchValue;
          }

          if (sortDirection) sortFound = true;
        }
      }
    }

    // apply any default sort if no sort was supplied
    if (!sortFound) {
      const defaultSortColumn = this.activeFields.find(
        column => !!column.defaultSort
      );
      if (defaultSortColumn) {
        const fieldName = defaultSortColumn.field?.name;

        if (fieldName)
          this.sortDirections[fieldName] = defaultSortColumn.defaultSort!;
      }
    }
  }

  getUrlQuery() {
    const query: { [name: string]: string } = {};

    const { searchValues, sortDirections, skip, limit } = this;

    if (skip) query.skip = String(skip);
    if (limit !== undefined && limit !== DEFAULT_PAGE_SIZE)
      query.limit = String(limit);

    for (const fieldName of _.uniq([
      ...Object.keys(searchValues),
      ...Object.keys(sortDirections)
    ])) {
      const searchValue = searchValues[fieldName];
      const sortDirection = sortDirections[fieldName];

      if (sortDirection || searchValue) {
        query[fieldName] =
          (sortDirection || '') +
          (searchValue
            ? '.' +
              (Array.isArray(searchValue) ? searchValue.join(',') : searchValue)
            : '');
      }
    }

    return query;
  }

  cancelAutorun?: () => void;

  startReacting() {
    if (!this.cancelAutorun) {
      this.cancelAutorun = autorun(() => {
        const { route } = this.props;

        if (route) {
          const location = tyreant.router.location!;
          if (location.route !== route) return;

          const currentUrl = this.getUrlQuery();
          this.fromUrlQuery(
            location.query! as {
              [name: string]: string;
            }
          );
          const newUrl = this.getUrlQuery();

          if (currentUrl === newUrl) return;
          this.findAll();
        } else if (!this.isLocal) {
          this.findAll();
        }
      });
    }
  }

  /*
   * * * SELECTION
   */

  // TODO

  /*
   * * * CONFIGURATION
   */

  // TODO

  /*
   * * * INLINE EDITING
   */

  // TODO

  /*
   * * * IMPORT / EXPORT
   */

  // TODO
}
