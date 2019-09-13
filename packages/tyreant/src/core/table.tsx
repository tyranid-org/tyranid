import * as _ from 'lodash';
import * as React from 'react';

import { autorun, observable } from 'mobx';
import { observer } from 'mobx-react';

import { Col, Dropdown, Icon, Menu, message, Row, Table, Input } from 'antd';
import { PaginationProps } from 'antd/es/pagination';
import { ColumnProps } from 'antd/es/table';

import { Tyr } from 'tyranid/client';

import { tyreant } from '../tyreant';

import { getFilter, getFinder, getCellValue } from '../type';

import { TyrComponentProps } from './component';
import { TyrComponent } from '../core';
import { TyrActionFnOpts, TyrAction } from './action';
import {
  TyrSortDirection,
  TyrFieldLaxProps,
  getFieldName,
  TyrFieldBase
} from './field';
import Form, { WrappedFormUtils } from 'antd/lib/form/Form';

const { Item: FormItem } = Form;

const ObsTable = observer(Table);

const DEFAULT_PAGE_SIZE = 20;

interface EditableContextProps {
  form?: WrappedFormUtils;
}
const EditableContext = React.createContext<EditableContextProps>({});

interface FieldDefinition {
  sortDirection?: TyrSortDirection;
  searchValue?: string;
}

interface TableDefinition {
  [pathName: string]: FieldDefinition | number | undefined;
  skip?: number;
  limit?: number;
}

export interface TyrTableProps extends TyrComponentProps {
  className?: string;
  collection: Tyr.CollectionInstance;
  documents?: Tyr.Document[] & { count?: number };
  fields: TyrFieldLaxProps[];
  query?: Tyr.MongoQuery | (() => Tyr.MongoQuery);
  route?: string;
  actionIconType?: string;
  pageSize?: number;
  pinActionsRight?: boolean;
  actionTitle?: string | React.ReactNode;
  rowEdit?: boolean;
  size?: 'default' | 'middle' | 'small';
}

@observer
export class TyrTable extends TyrComponent<TyrTableProps> {
  @observable
  private store: {
    documents: Tyr.Document[] & { count?: number };
    loading: boolean;
    count: number;
    workingSearchValues: {
      [pathName: string]: string | undefined;
    };
    pageSize: number;
    editingKey?: Tyr.AnyIdType;
  } = {
    documents: this.props.documents || [],
    loading: false,
    count: 0,
    workingSearchValues: {},
    pageSize: this.props.pageSize || DEFAULT_PAGE_SIZE
  };

  tableDefn: TableDefinition = {};

  urlQueryToTableDefinition(query: { [name: string]: string }) {
    const defn: TableDefinition = { skip: 0, limit: this.store.pageSize };
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
          let sortDirection: TyrSortDirection, searchValue: string | undefined;

          if (dot !== -1) {
            sortDirection = value.substring(0, dot) as TyrSortDirection;
            searchValue = value.substring(dot + 1);
          } else {
            sortDirection = value as TyrSortDirection;
          }

          const obj: { [name: string]: string } = {
            sortDirection: sortDirection as TyrSortDirection
          };
          if (searchValue) obj.searchValue = searchValue;

          defn[name] = obj;
          if (sortDirection) sortFound = true;
        }
      }
    }

    // apply any default sort if no sort was supplied
    if (!sortFound) {
      const defaultSortColumn = this.props.fields.find(
        column => !!column.defaultSort
      );
      if (defaultSortColumn) {
        const fieldName = getFieldName(defaultSortColumn.field);

        if (fieldName) {
          let fieldDefn = defn[fieldName] as FieldDefinition;

          if (!fieldDefn) {
            fieldDefn = defn[fieldName] = {};
          }

          fieldDefn!.sortDirection = defaultSortColumn.defaultSort;
        }
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
    if (this.props.documents) {
      return;
    }

    if (this.props.route) {
      const location = tyreant.router.location!;
      if (location.route !== this.props.route) return;

      const defn = this.urlQueryToTableDefinition(location.query! as {
        [name: string]: string;
      });
      if (_.isEqual(this.tableDefn, defn)) return;

      this.tableDefn = defn;
    }

    const defn = this.tableDefn;

    for (const pathName in defn) {
      const field = defn[pathName] as FieldDefinition;

      if (field.searchValue) {
        this.store.workingSearchValues[pathName] = field.searchValue;
      }
    }

    const { store } = this;
    const { collection, query: baseQuery, fields: columns } = this.props;
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
        const pathName = getFieldName(column.field),
          field = pathName && collection.paths[pathName],
          finder = field && getFinder(field),
          fieldDefn = pathName && (defn[pathName] as FieldDefinition),
          searchValue = fieldDefn && fieldDefn.searchValue;

        if (finder) finder(field, opts, searchValue);

        if (fieldDefn) {
          const { sortDirection } = fieldDefn;

          if (sortDirection) {
            sort[pathName!] = sortDirection === 'ascend' ? 1 : -1;
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

  startFinding() {
    if (!this.cancelAutorun) {
      this.cancelAutorun = autorun(() => this.findAll());
    }
  }

  componentDidMount() {
    const { linkToParent } = this;

    if (!this.collection)
      throw new Error('could not determine collection for TyrForm');

    if (linkToParent) {
      this.enactUp(
        new TyrAction({
          traits: ['edit'],
          name: Tyr.pluralize(this.collection!.label),
          component: this,
          action: (opts: TyrActionFnOpts) => {
            this.find(opts.document!);
          }
        })
      );

      this.enactUp(
        new TyrAction({
          traits: ['cancel'],
          name: 'done',
          component: this,
          action: (opts: TyrActionFnOpts) => {}
        })
      );
    }
  }

  componentWillUnmount() {
    this.cancelAutorun!();
  }

  private isEditing = (document: Tyr.Document) =>
    document.$id === this.store.editingKey;

  private saveDocument = (form: WrappedFormUtils, docId: Tyr.AnyIdType) => {
    console.log('todo: save document');
    delete this.store.editingKey;
  };

  private cancelEdit = (docId: Tyr.AnyIdType) => {
    delete this.store.editingKey;
  };

  private getColumns(): ColumnProps<Tyr.Document>[] {
    const {
      collection,
      fields: columns,
      actionIconType,
      pinActionsRight,
      actionTitle
    } = this.props;
    const { workingSearchValues } = this.store;

    const tableDefn = this.tableDefn;

    const antColumns: ColumnProps<Tyr.Document>[] = columns.map(column => {
      const pathName = getFieldName(column.field);
      const field = pathName && collection.paths[pathName];

      const fieldDefn = pathName && (tableDefn[pathName] as FieldDefinition);
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
            [pathName!]: {
              ...((this.tableDefn[pathName!] as FieldDefinition) || {}),
              searchValue: workingSearchValues[pathName!] || ''
            }
          };

          this.goToRoute(defn);
        }
      };

      const np = field && field.namePath;

      return {
        dataIndex: pathName,
        //key: pathName,
        render: (text: string, document: Tyr.Document) => {
          const editable = this.isEditing(document);

          if (editable) {
            return (
              <EditableContext.Consumer>
                {({ form }) => {
                  if (!form || !pathName) return <span />;

                  return (
                    <span>
                      <FormItem>
                        <TyrFieldBase
                          path={np}
                          form={form}
                          document={document}
                        />
                      </FormItem>
                    </span>
                  );
                }}
              </EditableContext.Consumer>
            );
          }

          const render = column.render;

          return (
            <div className="tyr-table-cell">
              {render ? render(document) : getCellValue(field, document)}
            </div>
          );
        },
        sorter: field
          ? !field.link
            ? (a: Tyr.Document, b: Tyr.Document) =>
                field.type.compare(field, np && np.get(a), np && np.get(b))
            : undefined
          : undefined,
        sortOrder: sortDirection,
        title: column.label || (field && field.label),
        width: column.width || undefined,
        className: column.className,
        ...((field && getFilter(field, filterable)) || {}),
        ...(column.pinned ? { fixed: column.pinned } : {}),
        ...(column.align ? { align: column.align } : {})
      };
    });

    if (this.actions.length) {
      antColumns.push({
        key: '$actions',
        dataIndex: '$actions',
        title: actionTitle || '',
        render: (text: string, document: Tyr.Document) => {
          const editable = this.isEditing(document);

          if (editable) {
            return (
              <FormItem>
                <EditableContext.Consumer>
                  {ctxProps => {
                    if (!ctxProps.form) {
                      return <span>No Form!</span>;
                    }

                    return (
                      <a
                        onClick={() =>
                          this.saveDocument(ctxProps.form!, document.$id)
                        }
                        style={{ marginRight: 8 }}
                      >
                        Save
                      </a>
                    );
                  }}
                </EditableContext.Consumer>
                <a onClick={() => this.cancelEdit(document.$id)}>Cancel</a>
              </FormItem>
            );
          }

          const menu = (
            <Menu className="tyr-menu">
              {this.actions.map(action => (
                <Menu.Item className="tyr-menu-item" key={action.name}>
                  <button onClick={() => action.act({ document })}>
                    {action.label}
                  </button>
                </Menu.Item>
              ))}
            </Menu>
          );

          return (
            <Dropdown overlay={menu} trigger={['hover']}>
              <span className="tyr-menu-link">
                <Icon type={actionIconType || 'ellipsis'} />
              </span>
            </Dropdown>
          );
        },
        sorter: undefined,
        sortOrder: undefined,
        width: '40px',
        ...(!!pinActionsRight ? { fixed: 'right' } : {})
      });
    }

    return antColumns;
  }

  private handleTableChange = (
    pagination: PaginationProps,
    filters: { [pathName: string]: string[] },
    sorter: {
      order?: TyrSortDirection;
      columnKey: string;
    }
  ) => {
    const defn: TableDefinition = {};

    if (pagination.current) {
      defn.skip = (pagination.current! - 1) * this.store.pageSize;
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
    const { skip = 0, limit = this.store.pageSize } = this.tableDefn;
    const totalCount = this.store.count || 0;

    // there appears to be a bug in ant table when you switch from paged to non-paging and then back again
    // (forces a 10 row page size) ?
    //return true || totalCount > this.store.pageSize
    return totalCount > this.store.pageSize
      ? {
          defaultCurrent: Math.floor(skip / limit) + 1,
          total: totalCount,
          defaultPageSize: limit,
          size: 'default'
        }
      : false;
  };

  private onEditRow = (document: Tyr.Document, rowIndex: number) => {
    // Callback and check perms?
    this.store.editingKey = document.$id;
  };

  render() {
    const { documents, loading } = this.store;
    const { className, children, rowEdit, size } = this.props;

    const netClassName = 'tyr-table' + (className ? ' ' + className : '');

    return this.wrap(() => {
      if (this.props.decorator && (!this.decorator || !this.decorator.visible))
        return <div />;

      this.startFinding(); // want to delay finding until the control is actually shown

      const components = rowEdit
        ? {
            body: {
              row: EditableFormRow
            }
          }
        : undefined;

      return (
        <div className={netClassName}>
          {children && (
            <Row>
              <Col span={24} className="tyr-table-header">
                {children}
              </Col>
            </Row>
          )}
          <Row>
            <Col span={24}>
              <ObsTable
                loading={loading}
                components={components}
                rowKey="_id"
                size={size || 'small'}
                pagination={this.pagination()}
                onChange={this.handleTableChange}
                dataSource={
                  /* TODO: get rid of slice() once we go to Mobx 5 */ documents.slice()
                }
                columns={this.getColumns()}
                onRow={
                  rowEdit
                    ? (record, rowIndex) => {
                        return {
                          onDoubleClick: () => {
                            this.onEditRow(record, rowIndex);
                          }
                        };
                      }
                    : undefined
                }
              />
            </Col>
          </Row>
        </div>
      );
    });
  }
}

interface EditableRowProps {
  form: WrappedFormUtils;
  index: number;
  props: {};
}

const EditableRow: React.StatelessComponent<EditableRowProps> = ({
  form,
  index,
  ...props
}) => (
  <EditableContext.Provider value={{ form }}>
    <tr {...props} />
  </EditableContext.Provider>
);

export const EditableFormRow = Form.create()(EditableRow);
