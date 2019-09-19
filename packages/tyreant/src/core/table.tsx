/*
 - reset pagination somehow when filter applied
*/

import * as React from 'react';

import { autorun, observable } from 'mobx';
import { observer } from 'mobx-react';

import { compact, findIndex, isEqual } from 'lodash';

import {
  DragDropContext,
  Draggable,
  Droppable,
  DraggableProvided,
  DraggableStateSnapshot
} from 'react-beautiful-dnd';

import {
  Row,
  Col,
  Dropdown,
  Icon,
  Menu,
  message,
  Table,
  Spin,
  Modal,
  Switch
} from 'antd';
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

export type TyrTableConfig = {
  userId: string;
  documentUid?: string;
  collectionId?: string;
  required: string[];
  lockedLeft: number;
  title?: string;
  key?: string;
};

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
  saveDocument?: (document: Tyr.Document) => Promise<Tyr.Document>;
  onAfterSaveDocument?: (document: Tyr.Document) => void;
  onCancelAddNew?: () => void;
  onActionLabelClick?: () => void;
  scroll?: {
    x?: boolean | number | string;
    y?: boolean | number | string;
  };
  footer?: (currentPageData: Object[]) => React.ReactNode;
  title?: (currentPageData: Object[]) => React.ReactNode;
  showHeader?: boolean;
  config?: TyrTableConfig;
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
    newDocument?: Tyr.Document;
    showConfig: boolean;
    fields: TyrTableColumnFieldProps[];
    tableConfig?: any;
  } = {
    documents: this.props.newDocument
      ? [this.props.newDocument, ...(this.props.documents || [])]
      : this.props.documents || [],
    loading: false,
    count: this.props.documents ? this.props.documents.length : 0,
    workingSearchValues: {},
    pageSize: this.props.pageSize || DEFAULT_PAGE_SIZE,
    editingKey: '',
    isSavingDocument: false,
    tableDefn: {},
    showConfig: false,
    fields: []
  };

  componentWillReceiveProps(props: TyrTableProps) {
    if (this.store.newDocument) {
      if (this.store.newDocument.$id) {
        delete this.store.newDocument;
      }
    } else if (props.newDocument && !props.newDocument.$id) {
      this.store.documents = [props.newDocument, ...this.store.documents];
      this.store.newDocument = props.newDocument;
    }
  }

  defaultToTableDefinition() {
    const defn: TableDefinition = { skip: 0, limit: this.store.pageSize };

    const defaultSortColumn = this.store.fields.find(
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
      const defaultSortColumn = this.store.fields.find(
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
      this.store.tableDefn = {
        ...this.defaultToTableDefinition(),
        ...this.store.tableDefn
      };
      return;
    }

    if (this.props.route) {
      const location = tyreant.router.location!;
      if (location.route !== this.props.route) return;

      const defn = this.urlQueryToTableDefinition(location.query! as {
        [name: string]: string;
      });
      if (isEqual(this.store.tableDefn, defn)) return;

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
  private _mounted: boolean = false;

  startFinding() {
    if (!this.cancelAutorun) {
      this.cancelAutorun = autorun(() => this.findAll());
    }
  }

  async componentDidMount() {
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

    if (this.props.config) {
      this.store.loading = true;
      const config = await TyrTableConfigModal.ensureConfig(
        this.props.fields,
        this.props.config
      );

      if (config) {
        this.store.fields = config.newColumns;
        this.store.tableConfig = config.tableConfig;
      } else {
        this.store.fields = this.props.fields;
      }
      this.store.loading = false;
    }

    this._mounted = true;
  }

  componentWillUnmount() {
    this.cancelAutorun!();
    this._mounted = false;
  }

  private onUpdateTableConfig = async (tableConfig: any) => {
    if (this.props.config) {
      const config = await TyrTableConfigModal.ensureConfig(
        this.props.fields,
        this.props.config,
        tableConfig
      );

      if (config) {
        this.store.tableConfig = config.tableConfig;
        this.store.fields = config.newColumns;
      }
    }
  };

  private isEditing = (document: Tyr.Document) =>
    document.$id === this.store.editingKey ||
    this.props.newDocument === document;

  private saveDocument = (form: WrappedFormUtils, docId: Tyr.AnyIdType) => {
    let document = this.store.documents.find(d => d.$id === docId);

    if (!document) {
      return;
    }

    const { saveDocument, onAfterSaveDocument } = this.props;
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
        } else {
          await document.$save();
        }

        document.$cache();

        if (isNew) {
          this.store.documents = [document, ...this.store.documents];
          this.store.count = this.store.documents.length;
        } else {
          this.store.documents = this.store.documents.map(doc => {
            return doc.$id === document!.$id ? document! : doc;
          });
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

  private cancelEdit = (doc: Tyr.Document) => {
    const { onCancelAddNew } = this.props;
    delete this.store.editingKey;
    this.store.editingKey = '';

    if (doc && doc.$orig) {
      doc.$revert();
    }

    if (!doc.$id && onCancelAddNew) onCancelAddNew();
  };

  private getColumns(): ColumnProps<Tyr.Document>[] {
    const {
      collection,
      actionIconType,
      pinActionsRight,
      actionLabel,
      documents,
      newDocument
    } = this.props;
    const { workingSearchValues, fields: columns } = this.store;

    const tableDefn = this.store.tableDefn;
    const localSearch = !!documents;
    const isAddingNewDocument = newDocument && newDocument.$id === '';

    const antColumns: ColumnProps<Tyr.Document>[] = columns.map(column => {
      const pathName = getFieldName(column.field);
      const field = pathName && collection.paths[pathName];

      (field as any).column = column;

      const fieldDefn = pathName && (tableDefn[pathName] as FieldDefinition);
      const { sortDirection } = fieldDefn || {
        sortDirection: undefined
      };

      const filterable = {
        searchValues: workingSearchValues,
        onFilterChange: () => {
          // TODO:  remove this hack once we upgrade to latest ant
          if (this._mounted) {
            this.setState({});
          }
        },
        onSearch: () => {
          if (!this.props.documents) {
            const defn: TableDefinition = {
              [pathName!]: {
                ...((this.store.tableDefn[pathName!] as FieldDefinition) || {}),
                searchValue: workingSearchValues[pathName!] || ''
              }
            };

            this.goToRoute(defn);
          }
        },
        localSearch,
        localDocuments: documents
      };

      const np = field ? field.namePath : undefined;

      let sorter = undefined;

      if (field) {
        if (column.sortComparator) {
          sorter = column.sortComparator;
        } else {
          sorter = (a: Tyr.Document, b: Tyr.Document) => {
            const av = np && np.get(a);
            const bv = np && np.get(b);

            return field.type.compare(field, av, bv);
          };
        }
      }

      const filteredValue = pathName
        ? filterable.searchValues[pathName]
        : undefined;

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
              mode: column.mode,
              searchOptionRenderer: column.searchOptionRenderer,
              searchSortById: column.searchSortById,
              renderField: column.renderField,
              renderDisplay: column.renderDisplay,
              noLabel: true
            };

            return (
              <EditableContext.Consumer>
                {({ form }) => {
                  if (!form || !pathName) return <span />;

                  return (
                    <span>
                      <TyrFieldBase
                        path={np!}
                        form={form}
                        document={document}
                        {...fieldProps}
                      />
                    </span>
                  );
                }}
              </EditableContext.Consumer>
            );
          }

          const render = column.renderDisplay;

          return (
            <div className="tyr-table-cell">
              {render ? render(document) : getCellValue(np!, document)}
            </div>
          );
        },
        sorter: isAddingNewDocument ? undefined : sorter,
        sortOrder: isAddingNewDocument ? undefined : sortDirection,
        title: column.label || (field && field.label),
        width: column.width || undefined,
        className: column.className,
        ellipsis: column.ellipsis,
        ...(!isAddingNewDocument && filteredValue
          ? { filteredValue: [filteredValue] }
          : {}),
        ...((!isAddingNewDocument && np && getFilter(np, filterable, column)) ||
          {}),
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
              return <Spin tip="Saving..." />;
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
                <a onClick={() => this.cancelEdit(document)}>Cancel</a>
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
    },
    extra: any
  ) => {
    console.log(extra);
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

    if (this.props.route) this.goToRoute(defn);
    else this.store.tableDefn = { ...this.store.tableDefn, ...defn };

    if (this._mounted) {
      this.setState({}); // Hack to force a table re-render
    }
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
    document.$snapshot();
  };

  render() {
    const { documents, loading, showConfig, fields } = this.store;
    const {
      className,
      children,
      rowEdit,
      size,
      onActionLabelClick,
      scroll,
      footer,
      title,
      showHeader,
      config: tableConfig
    } = this.props;

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
              {fields && (
                <ObsTable
                  loading={loading}
                  components={components}
                  rowKey="_id"
                  size={size || 'small'}
                  pagination={this.pagination()}
                  onChange={this.handleTableChange}
                  footer={footer}
                  title={title}
                  showHeader={showHeader}
                  dataSource={
                    /* TODO: get rid of slice() once we go to Mobx 5 */ documents.slice()
                  }
                  columns={this.getColumns()}
                  scroll={scroll}
                  onHeaderRow={(columns, index) => {
                    const column = columns[index];

                    if (column.key === '$actions') {
                      return {
                        onClick: () => {
                          onActionLabelClick && onActionLabelClick();
                          this.store.showConfig = true;
                        }
                      };
                    }
                  }}
                  onRow={
                    rowEdit
                      ? (record, rowIndex) => {
                          return {
                            onDoubleClick: () => {
                              this.onEditRow(record, rowIndex);

                              if (this._mounted) {
                                this.setState({});
                              }
                            }
                          };
                        }
                      : undefined
                  }
                />
              )}
              {showConfig &&
                tableConfig && (
                  <TyrTableConfigModal
                    columns={this.props.fields}
                    config={tableConfig}
                    tableConfig={this.store.tableConfig}
                    onCancel={() => (this.store.showConfig = false)}
                    onUpdate={this.onUpdateTableConfig}
                  />
                )}
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

type TyrTableConfigType = {
  key?: string;
  name?: string;
  fields: { name: string; hidden?: boolean }[];
  documentUid?: string;
  userId: string;
  collectionId?: string;
};

type TyrTableConfigProps = {
  config: TyrTableConfig;
  tableConfig?: TyrTableConfigType;
  onCancel: () => void;
  onUpdate: (tableConfig: any) => void;
  columns: TyrTableColumnFieldProps[];
};

type ColumnConfigField = {
  name: string;
  label: string;
  locked: boolean;
  hidden: boolean;
};

type TyrTableConfigState = {
  tableConfig?: any;
  columnFields: ColumnConfigField[];
};

class TyrTableConfigModal extends React.Component<
  TyrTableConfigProps,
  TyrTableConfigState
> {
  state: TyrTableConfigState = {
    columnFields: []
  };

  componentWillMount() {
    const { columns, config } = this.props;
    let tableConfig: TyrTableConfigType;

    if (this.props.tableConfig) {
      tableConfig = this.props.tableConfig;
    } else {
      const { documentUid, collectionId, userId } = this.props.config;
      const columnFields = compact(
        this.props.columns.map(c => getFieldName(c.field))
      ) as string[];
      tableConfig = new Tyr.byName.tyrTableConfig({
        documentUid,
        collectionId,
        userId,
        fields: columnFields.map(c => {
          return {
            name: c
          };
        })
      }) as any;
    }

    const { documentUid } = tableConfig;
    const collection = Tyr.parseUid(documentUid!).collection;

    const columnFields = tableConfig.fields.map((f: any, index: number) => {
      const column = columns.find(c => c.field === f.name);
      const pathName = getFieldName(column!.field);
      const field = pathName && collection.paths[pathName];

      return {
        name: f.name,
        label: ((column && column.label) || (field && field.label)) as string,
        locked: index < config.lockedLeft,
        hidden: !!f.hidden
      };
    });

    this.setState({ tableConfig, columnFields });
  }

  private onSave = async () => {
    const { onUpdate, onCancel, tableConfig } = this.props;
    const { columnFields } = this.state;

    const newTableConfig = new Tyr.byName.tyrTableConfig({
      ...tableConfig,
      fields: columnFields
    });

    await newTableConfig.$save();

    onUpdate && onUpdate(newTableConfig);
    onCancel();
  };

  static ensureConfig = async (
    columns: TyrTableColumnFieldProps[],
    config: TyrTableConfig,
    existingTableConfig?: any
  ) => {
    let tableConfig: any;

    if (existingTableConfig) {
      tableConfig = existingTableConfig;
    } else {
      const { documentUid, collectionId, userId, key } = config;

      if (!documentUid && !collectionId) {
        console.error(
          'Unable to load table configuration.  Neither the documentUid, not the collectionId have been specified.'
        );
        return Promise.resolve(undefined);
      }

      tableConfig = await Tyr.byName.tyrTableConfig.findOne({
        query: {
          userId,
          ...(key ? { key } : {}),
          ...(documentUid ? { documentUid } : { collectionId })
        }
      });

      if (!tableConfig) {
        const columnFields = compact(
          columns.map(c => getFieldName(c.field))
        ) as string[];
        tableConfig = new Tyr.byName.tyrTableConfig({
          documentUid,
          collectionId,
          userId,
          key,
          fields: columnFields.map(c => {
            return {
              name: c
            };
          })
        });
      }
    }

    const orderedColumns = orderedArray(tableConfig.fields, columns);
    return { tableConfig, newColumns: orderedColumns };
  };

  reorder = (list: any[], startIndex: number, endIndex: number) => {
    const { config } = this.props;

    const lockedItems = Array.from(list.slice(0, config.lockedLeft));
    const orderableItems = Array.from(
      list.slice(config.lockedLeft, list.length)
    );
    const [removed] = orderableItems.splice(startIndex, 1);
    orderableItems.splice(endIndex, 0, removed);

    return [...lockedItems, ...orderableItems];
  };

  onDragEnd = (result: any) => {
    // dropped outside the list
    if (!result.destination) {
      return;
    }

    const columnFields = this.reorder(
      this.state.columnFields,
      result.source.index,
      result.destination.index
    );

    this.setState({
      columnFields
    });
  };

  onChangeVisibility = (field: ColumnConfigField) => {
    const { columnFields } = this.state;
    const columnField = columnFields.find(df => df.name === field.name);

    if (columnField) {
      columnField.hidden = !columnField.hidden;
      this.setState({ columnFields: columnFields.slice() });
    }
  };

  render() {
    const { onCancel, config, tableConfig } = this.props;
    const { columnFields } = this.state;

    const lockedFields = columnFields.slice(0, config.lockedLeft);
    const draggableFields = columnFields.slice(
      config.lockedLeft,
      columnFields.length
    );

    return (
      <Modal
        className="tyr-modal"
        visible={true}
        onCancel={onCancel}
        onOk={this.onSave}
        okText="Save"
        cancelText="Cancel"
        title={config.title || 'Column Visibility'}
      >
        {!tableConfig && <span>No config!</span>}

        {tableConfig && (
          <div style={getListStyle(false)}>
            {lockedFields.map(f => (
              <TyrTableColumnConfigItem key={f.name} field={f} />
            ))}
          </div>
        )}

        {tableConfig && (
          <DragDropContext onDragEnd={this.onDragEnd}>
            <Droppable droppableId="droppable">
              {(provided, snapshot) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  style={getListStyle(snapshot.isDraggingOver)}
                >
                  {draggableFields.map(
                    (f: ColumnConfigField, index: number) => (
                      <Draggable
                        key={f.name}
                        draggableId={f.name}
                        index={index}
                        isDragDisabled={!!f.locked}
                      >
                        {(provided, snapshot) => (
                          <TyrTableColumnConfigItem
                            key={f.name}
                            field={f}
                            provided={provided}
                            snapshot={snapshot}
                            onChangeVisibility={this.onChangeVisibility}
                          />
                        )}
                      </Draggable>
                    )
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </Modal>
    );
  }
}

const orderedArray = (
  arrayWithOrder: { name: string }[],
  array: TyrTableColumnFieldProps[]
) => {
  const arrayToOrder = [...array];
  const orderedArray: TyrTableColumnFieldProps[] = [];
  const extra: TyrTableColumnFieldProps[] = [];

  while (arrayToOrder.length) {
    const current = arrayToOrder[0];
    const fieldName = getFieldName(current.field);

    if (fieldName) {
      let index = findIndex(arrayWithOrder, f => f.name == fieldName);

      if (index > -1) {
        orderedArray[index] = current;
      } else {
        extra.push(current);
      }
    } else {
      extra.push(current);
    }

    arrayToOrder.splice(0, 1);
  }

  return compact([...orderedArray, ...extra]);
};

const grid = 8;

const getListStyle = (isDraggingOver: boolean) => ({
  //background: isDraggingOver ? 'lightblue' : 'lightgrey',
  padding: grid
});

const getDragHandleStyle = (isDragging: boolean, isLocked: boolean) => ({
  // some basic styles to make the items look a bit nicer
  width: `20px`,
  height: `20px`,
  marginRight: `10px`,
  visibility: (isLocked ? 'hidden' : 'visible') as 'hidden' | 'visible'
});

const getFieldStyle = () => ({
  display: 'flex',
  justifyContent: 'space-between',
  width: '100%',
  border: '1px solid gray',
  borderRadius: '6px',
  padding: grid
});

const getRequiredStyle = () => ({
  marginLeft: '5px',
  fontSize: '.7em',
  fontStyle: 'italic',
  opacity: 0.7
});

type TyrTableColumnConfigItemProps = {
  field: ColumnConfigField;
  provided?: DraggableProvided;
  snapshot?: DraggableStateSnapshot;
  onChangeVisibility?: (field: ColumnConfigField) => void;
};

const TyrTableColumnConfigItem = (props: TyrTableColumnConfigItemProps) => {
  const { field, provided, snapshot, onChangeVisibility } = props;
  const { locked, name, label, hidden } = field;
  const isDragging = snapshot ? snapshot.isDragging : false;
  const innerRef = provided ? provided.innerRef : undefined;

  const getItemStyle = (isDragging: boolean, draggableStyle: any) => ({
    userSelect: 'none',
    margin: `0 0 ${grid}px 0`,
    display: 'flex',
    alignItems: 'center',

    // change background colour if dragging
    // background: isDragging ? 'lightgreen' : 'grey',

    // styles we need to apply on draggables
    ...draggableStyle
  });

  return (
    <div
      ref={innerRef}
      className="tyr-column-config-item tyr-column-config-item-locked"
      key={name}
      {...(provided ? provided.draggableProps : {})}
      style={getItemStyle(
        isDragging,
        provided ? provided.draggableProps.style : {}
      )}
    >
      <div
        className="tyr-column-config-item-handle"
        {...(provided ? provided.dragHandleProps : {})}
        style={getDragHandleStyle(isDragging, locked)}
      >
        {!locked && <Icon type="menu" />}
      </div>
      <div style={getFieldStyle()}>
        <span>
          <span>{label}</span>
          {locked && <span style={getRequiredStyle()}>required</span>}
        </span>
        {!locked && (
          <Switch
            checked={!hidden}
            onChange={() => onChangeVisibility && onChangeVisibility(field)}
          />
        )}
      </div>
    </div>
  );
};
