/*

 - Get sort working
 - Re-render not working until mouse move (on double click of row and cancel click)
 - figure out why first column is eyeglass
 - sort on TyrLink not there
 - set field value not setting
 - fixed column problems
 - when edit, looping on hook

*/


import * as _ from 'lodash';
import * as React from 'react';

import { autorun, observable } from 'mobx';
import { observer } from 'mobx-react';

import { Row, Col, Dropdown, Icon, Menu, message, Table, Spin } from 'antd';
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
import { TyrFormFields } from './form';
import * as type from '../type/type';

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

export interface TyrTableColumnFieldProps extends TyrFieldLaxProps {
  pinned?: 'left' | 'right';
  align?: 'left' | 'right' | 'center';
  ellipsis?: boolean;

  /**
   * What table column grouping should this be grouped under.
   */
  group?: string;
}

export interface TyrTableProps extends TyrComponentProps {
  className?: string;
  collection: Tyr.CollectionInstance;
  documents?: Tyr.Document[] & { count?: number };
  newDocument?: Tyr.Document;
  fields: TyrTableColumnFieldProps[];
  query?: Tyr.MongoQuery | (() => Tyr.MongoQuery);
  route?: string;
  actionIconType?: string;
  pageSize?: number;
  pinActionsRight?: boolean;
  actionLabel?: string | React.ReactNode;
  rowEdit?: boolean;
  size?: 'default' | 'middle' | 'small';
  saveDocument?: (document:Tyr.Document) => Promise<Tyr.Document>;
  onAfterSaveDocument?: (document:Tyr.Document) => void;
  onCancelAddNew?: () => void;
  onActionLabelClick?: () => void;
  scroll?: {
    x?: boolean | number | string;
    y?: boolean | number | string;
  }
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
    editingKey: Tyr.AnyIdType;
    isSavingDocument: boolean;
    tableDefn: TableDefinition;
  } = {
    documents: this.props.newDocument ? [this.props.newDocument, ...(this.props.documents || [])] : this.props.documents || [],
    loading: false,
    count: this.props.documents ? this.props.documents.length: 0,
    workingSearchValues: {},
    pageSize: this.props.pageSize || DEFAULT_PAGE_SIZE,
    editingKey: '',
    isSavingDocument: false,
    tableDefn: {}
  };

  defaultToTableDefinition() {
    const defn: TableDefinition = { skip: 0, limit: this.store.pageSize };

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

    return defn;
  }

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
    const defn = { ...this.store.tableDefn, ...tableDefn };
    const newQuery = this.tableDefinitionToUrlQuery(defn);

    tyreant.router.go({
      route: this.props.route,
      query: newQuery
    });
  }

  private async findAll() {
    if (this.props.documents) {
      this.store.tableDefn = this.defaultToTableDefinition();    
      return;
    }

    if (this.props.route) {
      const location = tyreant.router.location!;
      if (location.route !== this.props.route) return;

      const defn = this.urlQueryToTableDefinition(location.query! as {
        [name: string]: string;
      });
      if (_.isEqual(this.store.tableDefn, defn)) return;

      this.store.tableDefn = defn;
    }

    const defn = this.store.tableDefn;

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
          finder = field && getFinder(field.namePath),
          fieldDefn = pathName && (defn[pathName] as FieldDefinition),
          searchValue = fieldDefn && fieldDefn.searchValue;

        if (finder)
          finder((field as Tyr.FieldInstance).namePath, opts, searchValue);

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
    document.$id === this.store.editingKey || this.props.newDocument === document;

  private saveDocument = (form: WrappedFormUtils, docId: Tyr.AnyIdType) => {
    let document = this.store.documents.find( d => d.$id === docId);

    if (!document) {
      return;
    }

    const { saveDocument,onAfterSaveDocument } = this.props;
    const collection = document.$model;

    const isNew = !!document.$id;

    form.validateFields(async (err: Error, values: TyrFormFields) => {
      try {
        if (err || !document) return;
  
        for (const pathName in values) {
          const value = values[pathName];
          const field = collection.paths[pathName];
          type.mapFormValueToDocument(field.namePath, value, document);
        }
  
        if (saveDocument) {
          document = await saveDocument(document);
        } else  {
          await document.$save();
        }

        document.$cache();

        if (isNew) {
          this.store.documents = [document, ...this.store.documents];
          this.store.count = this.store.documents.length;
        } else {
          this.store.documents = this.store.documents.map( doc => { return doc.$id === document!.$id ? document! : doc; });
        }

        if (onAfterSaveDocument) {
          onAfterSaveDocument(document);
        }
      } catch (saveError) {
        if (saveError.message) message.error(saveError.message);
        message.error(saveError);
        throw saveError;
      }
    });
  
    this.store.editingKey = '';
  };

  private cancelEdit = (docId: Tyr.AnyIdType) => {
    const { onCancelAddNew } = this.props;
    delete this.store.editingKey;
    this.store.editingKey = '';

    if (onCancelAddNew) onCancelAddNew();
  };

  private getColumns(): ColumnProps<Tyr.Document>[] {
    const {
      collection,
      fields: columns,
      actionIconType,
      pinActionsRight,
      actionLabel
    } = this.props;
    const { workingSearchValues } = this.store;

    const tableDefn = this.store.tableDefn;

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
              ...((this.store.tableDefn[pathName!] as FieldDefinition) || {}),
              searchValue: workingSearchValues[pathName!] || ''
            }
          };

          this.goToRoute(defn);
        }
      };

      const np = field ? field.namePath : undefined;

      return {
        dataIndex: pathName,
        //key: pathName,
        render: (text: string, document: Tyr.Document) => {
          const editable = this.isEditing(document);

          if (editable) {
            const fieldProps = {
              placeholder: column.placeholder,
              autoFocus: column.autoFocus,
              required: column.required,
              width: column.width,
              multiple: column.multiple,
              mode: column.mode
            }

            return (
              <EditableContext.Consumer>
                {({ form }) => {
                  if (!form || !pathName) return <span />;

                  return (
                    <span>
                      <FormItem>
                        <TyrFieldBase
                          path={np!}
                          form={form}
                          document={document}
                          {...fieldProps}
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
              {render ? render(document) : getCellValue(np!, document)}
            </div>
          );
        },
        sorterX: field
          ? !field.link
            ? (a: Tyr.Document, b: Tyr.Document) =>
            {   const av = np && np.get(a);
                const bv = np && np.get(b);

                return field.type.compare(field, av, bv) }
            : undefined
          : undefined,
        sorter: field
          ? (a: Tyr.Document, b: Tyr.Document) =>
            {   const av = np && np.get(a);
                const bv = np && np.get(b);

                return field.type.compare(field, av, bv) }
            : undefined
          ,
        sortOrder: sortDirection,
        title: column.label || (field && field.label),
        width: column.width || undefined,
        className: column.className,
        ellipsis: column.ellipsis,
        ...((np && getFilter(np, filterable)) || {}),
        ...(column.pinned ? { fixed: column.pinned } : {}),
        ...(column.align ? { align: column.align } : {})
      };
    });

    if (this.actions.length) {
      antColumns.push({
        key: '$actions',
        dataIndex: '$actions',
        title: actionLabel || '',
        render: (text: string, document: Tyr.Document) => {
          const editable = this.isEditing(document);

          if (editable) {

            if (this.store.isSavingDocument) {
              return <Spin tip="Saving..."/>;
            }

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
    this.store.editingKey = '';
    const defn: TableDefinition = {};

    if (pagination.current) {
      defn.skip = (pagination.current! - 1) * this.store.pageSize;
    }

    if (filters) {
      for (const pathName in filters) {
        defn[pathName] = {
          ...((this.store.tableDefn[pathName] as FieldDefinition) || {}),
          searchValue: filters[pathName].join('.')
        };
      }
    }

    const sortFieldName = sorter.columnKey;
    if (sortFieldName) {
      // table doesn't appear to support multiple sort columns currently, so unselect any existing sort
      for (const pathName in this.store.tableDefn) {
        const fieldDefn = this.store.tableDefn[pathName] as FieldDefinition;

        if (fieldDefn && fieldDefn.sortDirection) {
          defn[pathName] = _.omit(fieldDefn, 'sortDirection');
        }
      }

      defn[sortFieldName] = {
        ...((this.store.tableDefn[sortFieldName] as FieldDefinition) || {}),
        sortDirection: sorter.order
      };
    } else {
      // Sort is cleared
      for (const pathName in this.store.tableDefn) {
        const fieldDefn = this.store.tableDefn[pathName] as FieldDefinition;

        if (fieldDefn && fieldDefn.sortDirection) {
          delete fieldDefn.sortDirection;
        }
      }
    }

    if (this.props.route)
      this.goToRoute(defn);
    else
      this.store.tableDefn = { ...this.store.tableDefn, ...defn };

    this.setState({}); // Hack to force a table re-render
  };

  private pagination = () => {
    const { skip = 0, limit = this.store.pageSize } = this.store.tableDefn;
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
    const { className, children, rowEdit, size, onActionLabelClick, fields, scroll } = this.props;

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
                scroll={ scroll }
                onHeaderRow={
//                  onActionLabelClick && this.actions.length ?
                    (column, index) => {
                      return {
                        onClick: fields.length === index ? onActionLabelClick : undefined
                      };
                    }
//                  : undefined
                }
                onRow={
                  rowEdit
                    ? (record, rowIndex) => {
                        return {
                          onDoubleClick: () => {
                            this.onEditRow(record, rowIndex);
                            this.setState({});
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

const EditableRow: React.StatelessComponent<EditableRowProps> =  ({
  form,
  index,
  ...props
}) => (
  <EditableContext.Provider value={{ form }}>
    <tr {...props} />
  </EditableContext.Provider>
);

export const EditableFormRow = Form.create()(EditableRow);
