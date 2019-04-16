import * as _ from 'lodash';
import * as React from 'react';

import { autorun, observable } from 'mobx';
import { observer } from 'mobx-react';

import { Col, Dropdown, Icon, Menu, message, Row, Table } from 'antd';
import { PaginationProps } from 'antd/es/pagination';
import { ColumnProps } from 'antd/es/table';

import { Tyr } from 'tyranid/client';

import { tyreant } from '../tyreant';

import { getFilter, getFinder, getCellValue } from '../type';

import { TyrAction } from './component';

export const TableContext = React.createContext<TyrTable | undefined>(
  undefined
);

const DEFAULT_PAGE_SIZE = 20;

export type TableSortDirection = 'ascend' | 'descend';

interface FieldDefinition {
  sortDirection?: TableSortDirection;
  searchValue?: string;
}

interface TableDefinition {
  [pathName: string]: FieldDefinition | number | undefined;
  skip?: number;
  limit?: number;
}

export interface TyrTableProps {
  className?: string;
  collection: Tyr.CollectionInstance;
  columns: {
    field: string;
    label?: string;
    defaultSort?: TableSortDirection;
    width?: string;
    filter?: (string | number)[];
  }[];
  query: Tyr.MongoQuery | (() => Tyr.MongoQuery);
  route: string;
  actions?: JSX.Element[];
}

@observer
export class TyrTable extends React.Component<TyrTableProps> {
  @observable
  private store: {
    documents: Tyr.Document[] & { count?: number };
    loading: boolean;
    count: number;
    workingSearchValues: {
      [pathName: string]: string | undefined;
    };
  } = {
    documents: [],
    loading: false,
    count: 0,
    workingSearchValues: {}
  };

  tableDefn: TableDefinition = {};

  urlQueryToTableDefinition(query: { [name: string]: string }) {
    const defn: TableDefinition = { skip: 0, limit: DEFAULT_PAGE_SIZE };
    let sortFound = false;

    for (const name in query) {
      const value = query[name];

      switch (name) {
        case 'skip':
        case 'limit':
          defn[name] = parseInt(value, 10);
          break;
        default: {
          const dot = value.indexOf('.');
          let sortDirection: TableSortDirection,
            searchValue: string | undefined;

          if (dot !== -1) {
            sortDirection = value.substring(0, dot) as TableSortDirection;
            searchValue = value.substring(dot + 1);
          } else {
            sortDirection = value as TableSortDirection;
          }

          const obj: { [name: string]: string } = {
            sortDirection: sortDirection as TableSortDirection
          };
          if (searchValue) obj.searchValue = searchValue;

          defn[name] = obj;
          if (sortDirection) sortFound = true;
        }
      }
    }

    // apply any default sort if no sort was supplied
    if (!sortFound) {
      const defaultSortColumn = this.props.columns.find(
        column => !!column.defaultSort
      );
      if (defaultSortColumn) {
        let fieldDefn = defn[defaultSortColumn.field] as FieldDefinition;

        if (!fieldDefn) {
          fieldDefn = defn[defaultSortColumn.field] = {};
        }

        fieldDefn!.sortDirection = defaultSortColumn.defaultSort;
      }
    }

    return defn;
  }

  tableDefinitionToUrlQuery(tableDefn: TableDefinition) {
    const query: { [name: string]: string } = {};

    for (const name in tableDefn) {
      const value = tableDefn[name];

      switch (name) {
        case 'skip':
          if (value) query.skip = '' + value;
          break;

        case 'limit':
          if (value !== DEFAULT_PAGE_SIZE) query.limit = '' + value;
          break;

        default: {
          const { sortDirection, searchValue } = value as FieldDefinition;

          if (sortDirection || searchValue) {
            query[name] =
              (sortDirection || '') + (searchValue ? '.' + searchValue : '');
          }
        }
      }
    }

    return query;
  }

  private goToRoute(tableDefn: TableDefinition) {
    const defn = { ...this.tableDefn, ...tableDefn };
    const newQuery = this.tableDefinitionToUrlQuery(defn);

    tyreant.router.go({
      route: this.props.route,
      query: newQuery
    });
  }

  private async findAll() {
    const location = tyreant.router.location!;
    if (location.route !== this.props.route) return;

    const defn = this.urlQueryToTableDefinition(location.query! as {
      [name: string]: string;
    });
    if (_.isEqual(this.tableDefn, defn)) return;

    this.tableDefn = defn;
    for (const pathName in defn) {
      const field = defn[pathName] as FieldDefinition;

      if (field.searchValue) {
        this.store.workingSearchValues[pathName] = field.searchValue;
      }
    }

    const { store } = this;
    const { collection, query: baseQuery, columns } = this.props;
    const { skip, limit } = defn;

    try {
      store.loading = true;

      const query = {
        ...(typeof baseQuery === 'function' ? baseQuery() : baseQuery)
      };

      const sort: { [key: string]: number } = {};

      const opts: Tyr.anny /* Tyr.Options_Find */ = {
        query,
        count: true,
        skip,
        limit,
        sort
      };

      for (const column of columns) {
        const pathName = column.field,
          field = collection.paths[pathName],
          finder = getFinder(field),
          fieldDefn = defn[pathName] as FieldDefinition,
          searchValue = fieldDefn && fieldDefn.searchValue;

        if (finder) finder(field, opts, searchValue);

        if (fieldDefn) {
          const { sortDirection } = fieldDefn;

          if (sortDirection) {
            sort[pathName] = sortDirection === 'ascend' ? 1 : -1;
          }
        }
      }

      const docs = await collection.findAll(opts);

      store.count = docs.count!;
      store.documents = docs;

      store.loading = false;
    } catch (err) {
      message.error(err.message);
    }
  }

  private cancelAutorun?: () => void;

  componentWillMount() {
    this.cancelAutorun = autorun(() => this.findAll());
  }

  componentWillUnmount() {
    this.cancelAutorun!();
  }

  private actions: TyrAction[] = [];
  enact(action: TyrAction) {
    this.actions.push(action);
  }

  private getColumns(): ColumnProps<Tyr.Document>[] {
    const { collection, columns } = this.props;
    const { workingSearchValues } = this.store;

    const tableDefn = this.tableDefn;

    const antColumns: ColumnProps<Tyr.Document>[] = columns.map(column => {
      const pathName = column.field;
      const field = collection.paths[pathName];

      const fieldDefn = tableDefn[pathName] as FieldDefinition;
      const { sortDirection } = fieldDefn || {
        sortDirection: undefined
      };

      const filterable = {
        searchValues: workingSearchValues,
        onFilterChange: () => {
          // TODO:  remove this hack once we upgrade to latest ant
          this.setState({});
        },
        onSearch: () => {
          const defn: TableDefinition = {
            [pathName]: {
              ...((this.tableDefn[pathName] as FieldDefinition) || {}),
              searchValue: workingSearchValues[pathName] || ''
            }
          };

          this.goToRoute(defn);
        }
      };

      const np = field.namePath;

      return {
        dataIndex: pathName,
        //key: pathName,
        render: (text: string, document: Tyr.Document) => {
          return (
            <div className="tyr-table-cell">
              {getCellValue(field, document)}
            </div>
          );
        },
        sorter: !field.link
          ? (a: Tyr.Document, b: Tyr.Document) =>
              field.type.compare(field, np.get(a), np.get(b))
          : undefined,
        sortOrder: sortDirection,
        title: column.label || field.label,
        width: column.width || undefined,
        ...(getFilter(field, filterable) || {})
      };
    });

    if (this.actions.length) {
      antColumns.push({
        key: '$actions',
        dataIndex: '$actions',
        title: '',
        render: (text: string, document: Tyr.Document) => {
          const menu = (
            <Menu className="tyr-menu">
              {this.actions.map(action => (
                <Menu.Item className="tyr-menu-item" key="0">
                  <button onClick={() => action.act(document)}>
                    {action.label}
                  </button>
                </Menu.Item>
              ))}
            </Menu>
          );
          return (
            <Dropdown overlay={menu} trigger={['hover']}>
              <span className="tyr-menu-link">
                <Icon type="ellipsis" />
              </span>
            </Dropdown>
          );
        },
        sorter: undefined,
        sortOrder: undefined,
        width: '40px'
      });
    }

    return antColumns;
  }

  private handleTableChange = (
    pagination: PaginationProps,
    filters: { [pathName: string]: string[] },
    sorter: {
      order?: TableSortDirection;
      columnKey: string;
    }
  ) => {
    const defn: TableDefinition = {};

    if (pagination.current) {
      defn.skip = (pagination.current! - 1) * DEFAULT_PAGE_SIZE;
    }

    if (filters) {
      for (const pathName in filters) {
        defn[pathName] = {
          ...((this.tableDefn[pathName] as FieldDefinition) || {}),
          searchValue: filters[pathName].join('.')
        };
      }
    }

    const sortFieldName = sorter.columnKey;
    if (sortFieldName) {
      // table doesn't appear to support multiple sort columns currently, so unselect any existing sort
      for (const pathName in this.tableDefn) {
        const fieldDefn = this.tableDefn[pathName] as FieldDefinition;

        if (fieldDefn && fieldDefn.sortDirection) {
          defn[pathName] = _.omit(fieldDefn, 'sortDirection');
        }
      }

      defn[sortFieldName] = {
        ...((this.tableDefn[sortFieldName] as FieldDefinition) || {}),
        sortDirection: sorter.order
      };
    }

    this.goToRoute(defn);
  };

  private pagination = () => {
    const { skip = 0, limit = DEFAULT_PAGE_SIZE } = this.tableDefn;
    const totalCount = this.store.count || 0;

    // there appears to be a bug in ant table when you switch from paged to non-paging and then back again
    // (forces a 10 row page size) ?
    return true || totalCount > DEFAULT_PAGE_SIZE
      ? {
          defaultCurrent: Math.floor(skip / limit) + 1,
          total: totalCount,
          defaultPageSize: limit,
          size: 'default'
        }
      : false;
  };

  render() {
    const { documents, loading } = this.store;
    const { className, actions } = this.props;

    const ObsTable = observer(Table);

    const netClassName = 'tyr-table' + (className ? ' ' + className : '');

    return (
      <TableContext.Provider value={this}>
        <div className={netClassName}>
          {actions &&
            actions.length && (
              <Row>
                <Col span={24} className="tyr-table-header">
                  {actions[0]}
                </Col>
              </Row>
            )}
          <Row>
            <Col span={24}>
              <ObsTable
                loading={loading}
                rowKey="_id"
                size="small"
                pagination={this.pagination()}
                onChange={
                  // ant ts def is incorrect
                  this.handleTableChange as Tyr.anny
                }
                dataSource={
                  /* TODO: get rid of slice() once we go to Mobx 5 */ documents.slice()
                }
                columns={this.getColumns()}
              />
            </Col>
          </Row>
        </div>
      </TableContext.Provider>
    );
  }
}
