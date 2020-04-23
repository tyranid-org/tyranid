import * as React from 'react';

import { observer } from 'mobx-react';
import { autorun, observable } from 'mobx';

import { Tyr } from 'tyranid/client';

import { getFinder, Filter, TyrActionFnOpts } from '../tyreant';
import {
  TyrComponentProps,
  TyrComponentState,
  TyrComponent,
} from './component';
import { TyrPathProps } from './path';
import { message } from 'antd';
import { getFilter } from '../type';
import { Tyreant } from '../tyreant';
import Pagination from 'antd/es/pagination';

import { getPathName } from './path';
import { TyrSortDirection } from './typedef';

export const DEFAULT_PAGE_SIZE = 20;

export interface TyrManyComponentProps<D extends Tyr.Document = Tyr.Document>
  extends TyrComponentProps<D> {
  // QUERYING
  query?:
    | Tyr.MongoQuery
    | ((this: TyrManyComponent<D>, query: Tyr.MongoQuery) => Promise<void>);
  projection?: 'auto' | 'all' | string[];
  populate?: Tyr.Population;
  local?: boolean;
  documents?: D[] & { count?: number };
  preFind?: (
    this: TyrManyComponent<D>,
    findOpts: any // Tyr.FindAllOptions
  ) => Promise<void> | void;
  postFind?: (
    this: TyrManyComponent<D>,
    documents: D[]
  ) => Promise<void> | void;

  // PAGINATION
  pageSize?: number; // a.k.a. limit,
  pageSizeOptions?: string[];
  showSizeChanger?: boolean;
  showTotal?: (total: number, range: [number, number]) => React.ReactNode;

  showQuickTotal?: boolean;

  // FILTERING
  notifyFilterExists?: (exists: boolean) => void;

  // SORTING
  notifySortSet?: (columnName?: string, order?: TyrSortDirection) => void;

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
  }

  componentDidMount() {
    super.componentDidMount();

    const { documents, query } = this.props;

    this.setDefaultSort();

    if (documents) {
      this.sort();

      if (query) {
        // we need to know the query even for in-memory tables because when we run an csv export we need to query the same rows
        this.findOpts = { query };
      }
    }
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
  get local() {
    const { props } = this;
    return !!(props.local || props.documents);
  }

  /**
   * This has all the documents when local is active.
   */
  allDocuments!: D[];

  async query() {
    if (this.loading) return;

    const { props } = this;

    if (props.route) {
      Tyreant.router.go({
        route: props.route,
        query: this.getUrlQuery(),
      });
    } else {
      if (this.mounted) {
        if (this.local) {
          if (!this.allDocuments) {
            if (props.documents) this.allDocuments = props.documents!;
            else await this.findAll();
          }

          this.filterLocal();
          this.sort();
        } else {
          this.findAll();
        }

        await this.postQuery();
        //this.refresh();
      }
    }
  }

  async postQuery() {}

  async buildFindOpts() {
    const { query: baseQuery, projection, populate } = this.props;
    const { searchValues, sortDirections } = this;

    const query: Tyr.MongoQuery = {};
    const { linkToParent, linkFromParent, parentDocument } = this;

    if (parentDocument) {
      if (linkToParent) {
        query[linkToParent.name] = parentDocument.$id;
      } else if (linkFromParent) {
        const ids = linkFromParent.path.get(parentDocument);

        query._id = Array.isArray(ids) ? { $in: ids } : ids;
      }
    }

    if (typeof baseQuery === 'function') {
      await (baseQuery as (
        this: TyrManyComponent<D>,
        query: Tyr.MongoQuery
      ) => Promise<void>).call(this, query);
    } else {
      Object.assign(query, baseQuery);
    }

    const sort: { [key: string]: number } = {};

    const opts: any /* Tyr.Options_Find */ = {
      query,
      count: true,
      sort,
    };

    if (projection !== 'all') {
      const fields = Tyr.projectify(this.activePaths.map(p => p.path));

      if (Array.isArray(projection)) {
        for (const name in projection) {
          fields[name] = 1;
        }
      }

      // now we mix in all links so that when we link to child components we have the links available
      // TODO:  it would be ideal if we could analyze the child components and only mix in links that our child components
      //        actually need
      const { paths } = this.collection;
      for (const pathName in paths) {
        const field = paths[pathName];

        if (field.link) {
          fields[field.path.spath] = 1;
        }
      }

      opts.fields = fields;
    }

    if (this.hasPaging) {
      const { skip, limit } = this;

      opts.skip = skip;
      opts.limit = limit;
    }

    if (populate) opts.populate = Tyr.cloneDeep(populate);

    for (const pathProps of this.paths) {
      const { path } = pathProps;

      if (!path) continue;

      const pathName = path.name;

      if (!this.local) getFinder(path)?.(path, opts, searchValues[pathName]);

      const sortDirection = sortDirections[pathName];
      if (sortDirection) sort[pathName] = sortDirection === 'ascend' ? 1 : -1;
    }

    this.findOpts = opts;

    await this.props.preFind?.call(this, opts);
  }

  async findAll() {
    const { collection } = this.props;

    try {
      this.loading = true;

      await this.buildFindOpts();

      const docs = await collection!.findAll(this.findOpts);

      this.count = docs.count!;

      if (this.local) {
        this.allDocuments = docs;
      } else {
        this.documents = docs;
      }

      await this.postFind();

      await this.props.postFind?.call(this, docs);

      this.loading = false;
    } catch (err) {
      message.error(err.message);
    }
  }

  async postFind() {}

  /*
   * * * PAGINATION
   */

  defaultPageSize: number = (this.props.pageSize !== undefined
    ? this.props.pageSize
    : DEFAULT_PAGE_SIZE) as number;

  skip?: number;
  limit: number = this.defaultPageSize;

  count = 0;

  private paginationItemRenderer = (
    page: number,
    type: 'page' | 'prev' | 'next' | 'jump-prev' | 'jump-next',
    originalElement: React.ReactElement<HTMLElement>
  ) => {
    if (type === 'prev') return <a>Previous</a>;
    if (type === 'next') return <a>Next</a>;
    return originalElement;
  };

  paginationProps = () => {
    if (!this.limit) return false;

    const { showSizeChanger, pageSizeOptions, showTotal } = this.props;

    const { skip = 0, limit } = this;
    const totalCount = this.count || 0;

    //const morePages = totalCount > limit;

    const a = {
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
      showTotal,
    };

    return a;
  };

  handlePaginationChange = (page: number, pageSize?: number) => {
    const { limit } = this;

    this.skip = (page - 1) * limit;

    if (pageSize !== undefined && pageSize !== limit)
      this.limit = pageSize || this.defaultPageSize;

    this.query();
  };

  currentPageDocuments() {
    if (this.local && this.limit) {
      const { skip = 0, limit } = this;
      return this.documents.slice(skip, skip + limit);
    } else {
      return this.documents.slice();
    }
  }

  paginationComponent() {
    return this.props.pageSize === 0 ? (
      <span />
    ) : (
      <Pagination
        {...this.paginationProps()}
        onChange={this.handlePaginationChange}
        onShowSizeChange={this.handlePaginationChange}
      />
    );
  }

  quickTotalComponent() {
    return !this.props.showQuickTotal ? (
      <span />
    ) : (
      <span className="tyr-quick-total">
        <span className="quick-total-label">Total:</span>{' '}
        <span className="quick-total-value">{this.count}</span>
      </span>
    );
  }

  /*
   * * * FILTERS
   */

  filters: { [path: string]: ReturnType<Filter> | undefined } = {};
  getFilter(props: TyrPathProps<D>): ReturnType<Filter> {
    const path = props.path!;
    const pathName = path.name;
    const existingFilter = this.filters[pathName];
    if (existingFilter) return existingFilter;

    return (this.filters[pathName] = path && getFilter(this, props));
  }

  resetFilters = () => {
    const { notifyFilterExists } = this.props;
    const { searchValues } = this;
    for (const key of Object.keys(searchValues)) delete searchValues[key];

    this.setState({});
    this.updateConfigFilter();

    // Update if on props
    notifyFilterExists && notifyFilterExists(false);
  };

  filterLocal() {
    const { searchValues } = this;

    const checks: ((doc: Tyr.Document) => boolean)[] = [];

    for (const pathProps of this.paths) {
      const { path } = pathProps;

      if (!path) continue;

      const filter = this.getFilter(pathProps);

      const pathName = path.name,
        searchValue = searchValues[pathName];
      if (searchValue === undefined) continue;

      const onFilter = filter?.onFilter;
      if (onFilter) checks.push(document => onFilter(searchValue, document));
    }

    this.count = (this.documents = this.allDocuments.filter(doc =>
      checks.every(check => check(doc))
    )).length;
  }

  /*
   * * * SORTING
   */

  sortDirections: { [pathName: string]: TyrSortDirection } = {};

  resetSort = () => {
    const { notifySortSet } = this.props;

    this.setDefaultSort();
    this.sort();
    this.setState({});

    const sortColumn = this.paths.find(column => !!column.defaultSort);
    this.updateConfigSort(sortColumn?.path?.name, sortColumn?.defaultSort);

    if (notifySortSet) {
      // Update if on props
      notifySortSet(sortColumn?.path?.name, sortColumn?.defaultSort);
    }
  };

  setDefaultSort() {
    // Sort is only valid if column has a sort direction and is in active paths
    for (const key of Object.keys(this.sortDirections))
      delete this.sortDirections[key];

    const sortColumn = this.componentConfig?.fields.find(
      column =>
        !!column.sortDirection &&
        !!this.activePaths.find(ap => getPathName(ap.path) === column.name)
    );

    const sortName = sortColumn?.name;

    if (sortName)
      this.sortDirections[sortName] = sortColumn!
        .sortDirection! as TyrSortDirection;
  }

  // Sort the documents according to the current sort
  //
  // We need to do this so that when we enter editing mode
  // and disable sorting, the natural sort of the rows is
  // not any different than what the sort currently is.
  sort() {
    const documents = this.documents;
    let sortColumn: TyrPathProps<D> | undefined;

    let sortColumnName: string | null = null;

    for (const name in this.sortDirections) {
      if (this.sortDirections[name] !== undefined) {
        sortColumnName = name;
        break;
      }
    }

    // Find column
    if (sortColumnName) {
      sortColumn = this.paths.find(f => f.path?.name === sortColumnName);
    }

    if (sortColumn) {
      const path = sortColumn.path!;
      const pathName = path?.name;
      const field = path?.detail;

      const sortComparator = sortColumn.sortComparator;

      documents.sort((a: Tyr.Document, b: Tyr.Document) => {
        let result = sortComparator
          ? sortComparator(a, b)
          : path
          ? Math.sign(field.type.compare(field, path.get(a), path.get(b)))
          : 0;

        if (result === 0) {
          if (a.$model.labelField) {
            result = (a.$label || '').localeCompare(b.$label);
          }

          if (result === 0) {
            result = String(a.$id).localeCompare(String(b.$id));
          }
        }

        return result;
      });

      if (pathName && this.sortDirections[pathName] === 'descend')
        documents.reverse();
    }

    this.count = documents.length;
  }

  setStableDocuments = (docs: D[]) => {
    const cDocs = this.documents;

    if (!cDocs) {
      this.documents = docs;
      this.count = docs.length;
      return;
    }

    for (const d of docs) {
      const idx = this.documents.findIndex(cd => cd.$id === d.$id);

      if (idx > -1) {
        cDocs[idx] = d;
      } else {
        cDocs.push(d);
      }
    }

    for (let i = 0; i < cDocs.length; ) {
      const cDocId = cDocs[i].$id;
      const idx = docs.findIndex(doc => doc.$id === cDocId);

      if (idx === -1) {
        cDocs.splice(i, 1);
      } else {
        i++;
      }
    }

    this.count = cDocs.length;
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
      this.setDefaultSort();
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
      ...Object.keys(sortDirections),
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
  reacting = false;
  startReacting() {
    if (this.reacting) return;
    this.reacting = true;

    const { route } = this.props;
    if (route) {
      if (!this.cancelAutorun) {
        this.cancelAutorun = autorun(() => {
          this.componentConfig?.fields.forEach(f => {
            if (f.filter) {
              this.searchValues[f.name] = f.filter;
            }
          });

          // TODO:  route only works with non-local so far
          const location = Tyreant.router.location!;
          if (location.route === route) {
            const currentUrl = this.getUrlQuery();
            this.fromUrlQuery(
              location.query! as {
                [name: string]: string;
              }
            );
            const newUrl = this.getUrlQuery();

            if (currentUrl !== newUrl) this.query();
          }
        });
      }
    } else if (!this.props.documents) {
      const { decorator } = this;
      if (
        this.activePaths.length &&
        (!decorator || decorator.visible) &&
        (!this.parent || this.mounted)
      )
        this.query();
    }
  }

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
