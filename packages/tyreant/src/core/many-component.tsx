import * as React from 'react';

import { observer } from 'mobx-react';
import { autorun } from 'mobx';

import { Tyr } from 'tyranid/client';

import { getFinder, Filter, getDbSortPath } from '../tyreant';
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

import { ensureComponentConfig } from './component-config';

export const DEFAULT_PAGE_SIZE = 20;

const NULL_URL_FILTER_VALUE = '___';

export interface TyrManyComponentProps<D extends Tyr.Document = Tyr.Document>
  extends TyrComponentProps<D> {
  // QUERYING
  query?:
    | Tyr.MongoQuery
    | ((this: TyrManyComponent<D>, query: Tyr.MongoQuery) => Promise<void>);
  projection?: 'auto' | 'all' | string[] | Tyr.MongoProjection;
  populate?: Tyr.Population;
  local?: boolean;
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

  // FILTERS
  searchBar?: boolean;

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

  async componentDidMount() {
    await super.componentDidMount();

    const { documents, query } = this.props;

    // if using a route, set the sort when parsing the URL
    if (!this.props.route) {
      // this.setDefaultSort();
      // this.setDefaultFilters();
    }

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

  currentlyLoaded: any /* Tyr.FindAllOpts */;

  getQuery() {
    return {
      filterValues: this.filterValues,
      filterSearchValue: this.filterSearchValue,
      sortDirection: this.sortDirections,
      skip: this.skip,
      limit: this.limit,
    };
  }

  async load() {
    const aboutToLoad = this.getQuery();

    if (Tyr.isEqual(aboutToLoad, this.currentlyLoaded)) return;
    this.currentlyLoaded = Tyr.cloneDeep(aboutToLoad);

    try {
      // passing in loading: true to the table will cause the live dropdown filter to disappear
      this.loading++;
      const { props } = this;

      if (this.mounted) {
        if (this.local) {
          if (!this.allDocuments) {
            if (props.documents) this.allDocuments = props.documents!;
            else await this.find();
          }

          this.sort(this.filter(this.allDocuments!));
        } else {
          this.find();
        }

        if (this.local) {
          // This was causing live search filters dialogs to disappear-- we think loading (spin) was taking too long, so
          // the dialog closed when the table was getting dropped and re-created
          this.postQuery();
        } else {
          await this.postQuery();
        }

        //this.refresh();
      }
    } finally {
      this.loading--;
    }
  }

  /**
   * query -- handles URL, and calls
   *  load -- handles arranging data, and calls
   *   findAll -- handles querying data from the database
   */
  async query() {
    if (!this.visible || this.loading) return;

    const { props } = this;

    if (props.route) {
      Tyreant.router.go({
        route: props.route,
        query: this.getUrlQuery(),
      });
    } else {
      this.load();
    }
  }

  async requery() {
    this.currentlyLoaded = undefined;
    this.processingQuery = undefined;
    if (!this.props.documents) this.allDocuments = undefined;
    this.query();
  }

  async postQuery() {}

  async buildFindOpts() {
    const { query: baseQuery, projection, populate } = this.props;
    const { collection, filterValues, sortDirections } = this;

    const query: Tyr.MongoQuery = {};
    const { linkToParent, linkFromParent, parentDocument } = this;

    if (parentDocument) {
      if (linkToParent) {
        if (linkToParent.name === '_' && linkToParent.parent) {
          // This handles the case where the parent is the form and the child is a table
          query[linkToParent.parent.pathName] = parentDocument.$id;
        } else {
          query[linkToParent.name] = parentDocument.$id;
        }
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
      const fields: Tyr.MongoProjection = {};

      for (const pathProps of this.activePaths) {
        const { path } = pathProps;

        if (path) {
          path.projectify(fields);

          const { link } = path.detail;
          if (link && !link.isStatic()) {
            // bring in the denormalized label field if we have it and it's not static
            const labelPath = getDbSortPath(pathProps);
            if (labelPath) fields[labelPath] = 1;
          }
        }
      }

      if (Array.isArray(projection)) {
        for (const name of projection) {
          fields[name] = 1;
        }
      } else if (Tyr.isObject(projection)) {
        Object.assign(fields, projection);
      }

      // now we mix in all links so that when we link to child components we have the links available
      // TODO:  it would be ideal if we could analyze the child components and only mix in links that our child components
      //        actually need
      const { paths } = collection;
      for (const pathName in paths) {
        const field = paths[pathName];

        if (
          field.link &&
          !field.dynamicMatch &&
          !fields[field.path.fields[0].path.spath]
        ) {
          fields[field.path.spath] = 1;
        }
      }

      opts.fields = fields;
    }

    if (this.hasPaging && !this.local) {
      const { skip, limit } = this;

      opts.skip = skip;
      opts.limit = limit;
    }

    if (populate) opts.populate = Tyr.cloneDeep(populate);

    for (const pathProps of this.paths) {
      const { path } = pathProps;

      if (!path) continue;

      const pathName = path.name;

      if (!this.local)
        getFinder(path)?.(path, opts, filterValues[pathName], pathProps);

      const sortDirection = sortDirections[pathName];
      if (sortDirection) {
        const sortPath = getDbSortPath(pathProps);
        if (sortPath) sort[sortPath] = sortDirection === 'ascend' ? 1 : -1;
      }
    }

    if (!this.local) {
      const { filterSearchValue } = this;
      if (filterSearchValue) {
        const { labelField } = collection;

        if (labelField) {
          Tyr.query.and(opts.query, labelField.path.spath, {
            $regex: filterSearchValue,
            $options: 'i',
          });
        }
      }
    }

    this.findOpts = opts;

    await this.props.preFind?.call(this, opts);
  }

  async find() {
    const { collection } = this.props;

    try {
      await this.buildFindOpts();

      this.trace('find', 'findAll', this.findOpts);
      const docs = await collection!.findAll(this.findOpts);

      this.count = docs.count!;

      if (this.local) {
        this.allDocuments = docs;
      } else {
        this.documents = docs;
      }

      await this.postFind();

      await this.props.postFind?.call(this, docs);
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
      size: 'default' as 'default',
      itemRender: this.paginationItemRenderer,
      showSizeChanger: showSizeChanger === false ? false : true,
      pageSizeOptions,
      hideOnSinglePage: true,
      showTotal,
    };

    return a;
  };

  handlePaginationChange = (page: number, pageSize?: number) => {
    let { limit } = this;
    if (pageSize !== undefined && pageSize !== limit) {
      this.limit = limit = pageSize || this.defaultPageSize;
      page = 1;
    }

    this.skip = (page - 1) * limit;

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

  filter(documents: D[]) {
    const { filterValues, filterSearchValue } = this;

    const checks: ((doc: Tyr.Document) => boolean)[] = [];

    for (const pathProps of this.paths) {
      const { path } = pathProps;

      if (!path) continue;

      const filter = this.getFilter(pathProps);

      const pathName = path.name,
        searchValue = filterValues[pathName];
      if (searchValue === undefined) continue;

      const onFilter = filter?.onFilter;
      if (onFilter) checks.push(document => onFilter(searchValue, document));
    }

    if (filterSearchValue) {
      const { labelField } = this.collection;

      if (labelField) {
        const { path } = labelField;
        const regexp = new RegExp(filterSearchValue, 'i');
        checks.push(document => regexp.test(path.get(document)));
      }
    }

    return documents?.filter(doc => checks.every(check => check(doc)));
  }

  /*
   * * * SORTING
   */

  sortDirections: { [pathName: string]: TyrSortDirection } = {};

  resetSort = () => {
    const { notifySortSet } = this.props;

    const sortColumn = this.paths.find(column => !!column.defaultSort);
    this.updateConfigSort(sortColumn?.path?.name, sortColumn?.defaultSort);

    this.setDefaultSort();

    if (notifySortSet) {
      // Update if on props
      notifySortSet(sortColumn?.path?.name, sortColumn?.defaultSort);
    }

    this.sort();
    this.setState({});
  };

  setDefaultSort(ignoreConfig?: boolean) {
    // Sort is only valid if column has a sort direction and is in active paths
    Tyr.clear(this.sortDirections);

    if (!ignoreConfig) {
      const sortColumn = this.componentConfig?.fields.find(
        column =>
          !!column.sortDirection &&
          !!this.activePaths.find(ap => getPathName(ap.path) === column.name)
      );

      const sortName = sortColumn?.name;

      if (sortName) {
        this.sortDirections[sortName] = sortColumn!
          .sortDirection! as TyrSortDirection;
        return;
      }
    }

    const sortColumn = (this.activePaths || this.paths).find(
      column => !!column.defaultSort
    );
    if (sortColumn && sortColumn.defaultSort)
      this.sortDirections[getPathName(sortColumn.path)!] =
        sortColumn.defaultSort;
  }

  // Sort the documents according to the current sort
  //
  // We need to do this so that when we enter editing mode
  // and disable sorting, the natural sort of the rows is
  // not any different than what the sort currently is.
  sort(documents?: D[]) {
    // TODO:  ??=
    documents = documents ?? this.documents.slice();
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

      documents.sort((a, b) => {
        let result = sortComparator
          ? sortComparator(a, b)
          : path
          ? Math.sign(field.type.compare(field, path.get(a), path.get(b)))
          : 0;

        if (result === 0) {
          if (a.$model.labelField) {
            result = (a.$label || '').localeCompare(b.$label, undefined, {
              sensitivity: 'base',
            });
          }

          if (result === 0) {
            result = String(a.$id).localeCompare(String(b.$id));
          }
        }

        return result;
      });

      if (pathName && this.sortDirections[pathName] === 'descend')
        documents.reverse();

      this.documents = documents;
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
    this.setDefaultFilters(false);

    const urlHasPriority = !!(query.url ?? '').trim();

    if (!urlHasPriority) {
      this.componentConfig?.fields.forEach(f => {
        if (f.filter) {
          this.setFilterValue(f.name, f.filter);
        }
      });
    }

    this.saveConfig();

    let sortFound = false;

    for (const name in query) {
      const value = query[name];

      switch (name) {
        case 'skip':
        case 'limit':
          this[name] = parseInt(value, 10);
          break;
        case 'search':
          this.filterSearchValue = value;
          break;
        case 'url':
          break;
        default: {
          const dot = value.indexOf('.');
          let sortDirection: TyrSortDirection, filterValue: string | undefined;

          if (dot !== -1) {
            sortDirection = value.substring(0, dot) as TyrSortDirection;
            filterValue = value.substring(dot + 1);
          } else {
            sortDirection = value as TyrSortDirection;
          }

          this.sortDirections[name] = sortDirection || undefined;

          if (filterValue) {
            if (filterValue === NULL_URL_FILTER_VALUE) {
              delete this.filterValues[name];
            } else {
              // TODO:  we need to know the Field here because of it is a link or array of links we need to split the search value on '.'
              const canBeArray = filterValue.indexOf(',') >= 0; // this is not right -- need the Field
              this.filterValues[name] = canBeArray
                ? filterValue.split(',')
                : filterValue;
            }
          }

          if (sortDirection) sortFound = true;
        }
      }
    }

    // apply any default sort if no sort was supplied
    if (!sortFound) {
      this.setDefaultSort(urlHasPriority);
    }
  }

  getUrlQuery() {
    const query: { [name: string]: string } = {};

    const {
      filterValues,
      filterSearchValue,
      sortDirections,
      skip,
      limit,
    } = this;

    if (skip) query.skip = String(skip);
    if (limit !== undefined && limit !== this.defaultPageSize)
      query.limit = String(limit);

    for (const pathProps of this.activePaths || this.paths) {
      const { path } = pathProps;
      const pathName = path!.name;

      let filterValue = filterValues[pathName];
      if (Tyr.isEqual(filterValue, pathProps.defaultFilter))
        filterValue = undefined;
      else if (filterValue === undefined) filterValue = NULL_URL_FILTER_VALUE;

      let sortDirection: TyrSortDirection | undefined =
        sortDirections[pathName];
      if (sortDirection && sortDirection === pathProps.defaultSort)
        sortDirection = undefined;

      if (sortDirection || filterValue !== undefined) {
        query[pathName] =
          (sortDirection || '') +
          (filterValue !== undefined
            ? '.' +
              (Array.isArray(filterValue) ? filterValue.join(',') : filterValue)
            : '');
      }
    }

    if (filterSearchValue) query.search = filterSearchValue;

    query.url = '1';
    return query;
  }

  cancelAutorun?: () => void;
  active = false;

  processingQuery?: string;

  activate() {
    if (!this.mounted || !this.visible || this.active) return;

    this.active = true;

    // this happens inside the render (after wrap()) and we don't want to kick this off during the render
    // TOOD:  move this logic into wrap()
    setTimeout(() => {
      (async () => {
        const componentConfig = await ensureComponentConfig(
          this,
          this.paths,
          this.props.config!
        );

        this.componentConfig = componentConfig.componentConfig;
        this._activePaths = componentConfig.newColumns;

        const { route } = this.props;
        if (route) {
          if (!this.cancelAutorun) {
            this.cancelAutorun = autorun(() => {
              const location = Tyreant.router.location!;
              if (location.route === route) {
                const query = location.query! as {
                  [name: string]: string;
                };
                const queryStr = JSON.stringify(query);
                if (queryStr !== this.processingQuery) {
                  this.processingQuery = queryStr;

                  this.fromUrlQuery(query);

                  this.load();
                  this.active = true;
                }
              }
            });
          }
        } else if (!this.allDocuments) {
          const { decorator } = this;
          if (
            this.activePaths.length &&
            (!decorator || decorator.visible) &&
            (!this.parent || this.mounted)
          ) {
            this.setDefaultSort();
            this.setDefaultFilters();
            this.load();
          }
        }
      })();
    }, 0);
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
