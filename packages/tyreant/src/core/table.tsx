/*
 - Add resizeable columns: "re-resizable": "4.4.4",
   - https://ant.design/components/table/#components-table-demo-resizable-column
   - store in tableConfig
 - store filters in tableConfig
 - store sort in tableConfig
*/

import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { createRef } from 'react';
import { Tyr } from 'tyranid/client';
import { tyreant } from '../tyreant';

import { autorun, observable } from 'mobx';
import { observer } from 'mobx-react';

import { compact, findIndex, isEqual } from 'lodash';

import {
  DragDropContextProvider,
  DragSource,
  DropTarget,
  DropTargetMonitor
} from 'react-dnd';

import HTML5Backend from 'react-dnd-html5-backend';

import {
  DragDropContext,
  Draggable,
  Droppable,
  DraggableProvided,
  DraggableStateSnapshot,
  DropResult,
  ResponderProvided
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
  Switch,
  Button,
  Drawer
} from 'antd';

import { PaginationProps } from 'antd/es/pagination';
import { ColumnProps } from 'antd/es/table';
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
import { string } from 'prop-types';

const ObsTable = observer(Table);

const DEFAULT_PAGE_SIZE = 20;

let dndBackend: __ReactDnd.Backend;

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
  documentUid: string;
  collectionId: string;
  required: string[];
  lockedLeft: number;
  title?: string;
  header?: string | React.ReactNode;
  asDrawer?: boolean;
  compact?: boolean;
  key: string;
};

export interface TyrTableProps extends TyrComponentProps {
  className?: string;
  collection: Tyr.CollectionInstance;
  documents?: Tyr.Document[] & { count?: number };
  fields: TyrTableColumnFieldProps[];
  query?: Tyr.MongoQuery | (() => Tyr.MongoQuery);
  route?: string;
  actionHeaderLabel?: string | React.ReactNode;
  actionIconType?: string;
  actionTrigger?: 'hover' | 'click';
  actionColumnClassName?: string;
  pageSize?: number;
  pinActionsRight?: boolean;
  rowEdit?: boolean;
  canEditDocument?: (document: Tyr.Document) => boolean;
  size?: 'default' | 'middle' | 'small';
  saveDocument?: (document: Tyr.Document) => Promise<Tyr.Document>;
  onAfterSaveDocument?: (
    document: Tyr.Document,
    changedFields?: string[]
  ) => void;
  onBeforeSaveDocument?: (document: Tyr.Document) => void;
  onCancelAddNew?: () => void;
  onActionLabelClick?: () => void;
  onChangeTableConfiguration?: (fields: TyrTableConfigFields) => void;
  scroll?: {
    x?: boolean | number | string;
    y?: boolean | number | string;
  };
  footer?: (currentPageData: Object[]) => React.ReactNode;
  title?: (currentPageData: Object[]) => React.ReactNode;
  showHeader?: boolean;
  config?: TyrTableConfig;
  onLoad?: (tableControl: TyrTableControl) => void;
  rowSelection?: boolean;
  loading?: boolean;
  setEditing?: (editing: boolean) => void;
  onSelectRows?: (selectedRowIds: string[]) => void;
  orderable?: boolean;
  dndBackend?: __ReactDnd.Backend;
  moveRow?: (dragIndex: number, hoverIndex: number) => void;
  notifyFilterExists?: (exists: boolean) => void;
  notifySortSet?: (columnName?: string, order?: TyrSortDirection) => void;
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
    editingDocument?: Tyr.Document;
    isSavingDocument: boolean;
    tableDefn: TableDefinition;
    showConfig: boolean;
    fields: TyrTableColumnFieldProps[];
    tableConfig?: any;
    newDocument?: Tyr.Document;
    selectedRowKeys: string[];
  } = {
    documents: this.props.documents || [],
    loading: false,
    count: this.props.documents ? this.props.documents.length : 0,
    workingSearchValues: {},
    pageSize:
      this.props.pageSize !== undefined
        ? this.props.pageSize
        : DEFAULT_PAGE_SIZE,
    isSavingDocument: false,
    tableDefn: {},
    showConfig: false,
    fields: [],
    selectedRowKeys: []
  };

  async componentDidMount() {
    const { linkToParent } = this;
    const { actions, orderable } = this.props;

    if (orderable && !dndBackend) {
      dndBackend = this.props.dndBackend || HTML5Backend;
    }

    if (!this.collection) {
      throw new Error('could not determine collection for TyrForm');
    }

    if (actions) {
      for (const action of actions) {
        this.enact(action);
      }
    }

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

    const { config, fields, onLoad } = this.props;
    const store = this.store;

    if (config) {
      store.loading = true;
      const existingConfig = await ensureTableConfig(fields, config);

      if (existingConfig) {
        store.fields = existingConfig.newColumns;
        store.tableConfig = existingConfig.tableConfig;
      } else {
        store.fields = fields;
      }

      store.loading = false;
    } else {
      store.fields = fields;
    }

    this._mounted = true;

    onLoad && onLoad(new TyrTableControlImpl(this));
  }

  componentWillUnmount() {
    this.cancelAutorun && this.cancelAutorun();
    this._mounted = false;
  }

  UNSAFE_componentWillReceiveProps(nextProps: TyrTableProps) {
    if (this.props.documents && nextProps.documents) {
      if (this.props.orderable) {
        this.store.documents = nextProps.documents;
        this.store.count = nextProps.documents.length;
      } else {
        this.setSortedDocuments(nextProps.documents);
      }
    }

    if (this.store.fields.length && nextProps.fields) {
      this.store.fields = compact(
        nextProps.fields.map(f => {
          const fld = this.store.fields.find(sf => sf.field === f.field);

          if (fld) {
            return f;
          }

          return null;
        })
      ) as TyrTableColumnFieldProps[];
    } else {
      this.store.fields = nextProps.fields;
    }
  }

  // Sort the documents according to the current sort
  //
  // We need to do this so that when we enter editing mode
  // and disable sorting, the natural sort of the rows is
  // not any different than what the sort currently is.
  setSortedDocuments = (docs: Tyr.Document[]) => {
    let documents = docs;
    let sortColumn: TyrTableColumnFieldProps | undefined;

    if (this.store.tableDefn) {
      let sortColumnName: string | null = null;

      for (let name in this.store.tableDefn) {
        if (
          name !== 'skip' &&
          name !== 'limit' &&
          this.store.tableDefn[name] !== undefined
        ) {
          sortColumnName = name;
          break;
        }
      }

      // Find column
      if (sortColumnName) {
        sortColumn = this.props.fields.find(f => {
          const fName = getFieldName(f.field);
          return fName === sortColumnName;
        });
      }
    } else {
      sortColumn = this.props.fields.find(column => !!column.defaultSort);
    }

    if (sortColumn) {
      let field: Tyr.FieldInstance | undefined = undefined;
      let pathName: string | undefined = undefined;

      if (
        sortColumn.field &&
        (sortColumn.field as Tyr.FieldInstance).collection
      ) {
        field = sortColumn.field as Tyr.FieldInstance;
        pathName = field.path;
      } else {
        pathName = getFieldName(sortColumn.field);
        field = pathName ? this.props.collection.paths[pathName] : undefined;
      }

      const np = field ? field.namePath : undefined;

      docs.sort(
        sortColumn.sortComparator
          ? sortColumn.sortComparator
          : (a: Tyr.Document, b: Tyr.Document) => {
              const av = np && np.get(a);
              const bv = np && np.get(b);

              return field!.type.compare(field!, av, bv);
            }
      );

      if (pathName) {
        const fieldDef = this.store.tableDefn[pathName];

        if (
          fieldDef &&
          (fieldDef as FieldDefinition).sortDirection === 'descend'
        ) {
          docs.reverse();
        }
      }

      documents = docs;
    }

    this.store.documents = documents;
    this.store.count = documents.length;
  };

  setFieldValue = (fieldName: string, value: any) => {
    const document = this.store.newDocument || this.store.editingDocument;

    if (!document) {
      console.error(
        'Unable to setFieldValue, there is document available to set a value in!'
      );
      return;
    }

    const pathName = getFieldName(fieldName);

    if (!pathName) {
      console.error('Unable to setFieldValue, no field name found!');
      return;
    }

    const collection = document.$model;
    const field = pathName && collection.paths[pathName];

    if (!field) {
      console.error(
        `Unable to setFieldValue, no field found for ${fieldName}!`
      );
      return;
    }

    field.namePath.set(document, value);
  };

  addNewDocument = (doc: Tyr.Document) => {
    this.store.newDocument = doc;
    delete this.store.editingDocument;

    if (this._mounted) {
      this.setState({});
    }

    this.props.setEditing && this.props.setEditing(true);

    return true;
  };

  private defaultToTableDefinition() {
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

  private urlQueryToTableDefinition(query: { [name: string]: string }) {
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

  private tableDefinitionToUrlQuery(tableDefn: TableDefinition) {
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

  async refresh() {
    return this.findAll(true);
  }

  async findAll(reset?: boolean) {
    const {
      documents,
      route,
      collection,
      query: baseQuery,
      fields: columns
    } = this.props;
    const store = this.store;

    if (documents) {
      const defn = {
        ...this.defaultToTableDefinition(),
        ...store.tableDefn
      };

      if (isEqual(store.tableDefn, defn)) return;
      store.tableDefn = defn;

      return;
    }

    if (route) {
      const location = tyreant.router.location!;
      if (location.route !== route) return;

      const defn = this.urlQueryToTableDefinition(location.query! as {
        [name: string]: string;
      });

      if (!reset && isEqual(store.tableDefn, defn)) return;
      store.tableDefn = defn;
    }

    const defn = store.tableDefn;

    for (const pathName in defn) {
      const field = defn[pathName] as FieldDefinition;

      if (field.searchValue) {
        store.workingSearchValues[pathName] = field.searchValue;
      }
    }

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

  private startFinding() {
    if (!this.cancelAutorun) {
      this.cancelAutorun = autorun(() => this.findAll());
    }
  }

  private onUpdateTableConfig = async (savedTableConfig: any) => {
    const { config, fields, onChangeTableConfiguration } = this.props;

    if (config) {
      const tableConfig = await ensureTableConfig(
        fields,
        config,
        savedTableConfig
      );

      if (tableConfig) {
        this.store.tableConfig = tableConfig.tableConfig;
        this.store.fields = tableConfig.newColumns;

        onChangeTableConfiguration &&
          onChangeTableConfiguration(
            (tableConfig.tableConfig as any).fields.map(
              (f: TyrTableConfigField) => {
                return {
                  name: f.name,
                  hidden: !!f.hidden
                } as TyrTableConfigField;
              }
            )
          );
      }
    }
  };

  private isEditing = (document: Tyr.Document) => {
    const { editingDocument } = this.store;

    return (
      !document.$id || (editingDocument && document.$id === editingDocument.$id)
    );
  };

  private saveDocument = (form: WrappedFormUtils, doc: Tyr.Document) => {
    const {
      saveDocument,
      onAfterSaveDocument,
      onBeforeSaveDocument,
      setEditing
    } = this.props;

    const store = this.store;
    const { documents, newDocument, editingDocument } = store;

    let document = newDocument || editingDocument;

    if (!document) {
      setEditing && setEditing(false);
      message.error(`No document to save!`);
      return;
    }

    store.isSavingDocument = true;
    const docIdx = findIndex(documents, d => d.$id === document!.$id);
    const collection = document.$model;

    const orig = document.$orig;
    const changedFields: string[] = [];

    form.validateFields(async (err: Error, values: TyrFormFields) => {
      try {
        if (err || !document) {
          store.isSavingDocument = false;
          return;
        }

        // Don't think this is needed anymore
        // Plus, for some reason, field leafs are called, xxx_yyy in values,
        // not xxx.yyy - this causes field not to be found below

        // for (const pathName in values) {
        //   const value = values[pathName];
        //   const field = collection.paths[pathName];
        //   type.mapFormValueToDocument(field.namePath, value, document);
        // }

        if (orig) {
          for (const column of this.props.fields) {
            const pathName = getFieldName(column.field);
            const field = pathName && collection.paths[pathName];

            if (field) {
              const oldValue = field.namePath.get(orig);
              const newValue = field.namePath.get(document);

              if (!isEqual(oldValue, newValue)) {
                if (typeof column.label === 'string') {
                  changedFields.push(column.label as string);
                } else if (typeof field.label === 'string') {
                  changedFields.push(field.label);
                }
              }
            }
          }
        }

        onBeforeSaveDocument && onBeforeSaveDocument(document);

        if (saveDocument) {
          document = await saveDocument(document);
        } else {
          document = await document.$save();
        }

        if (document) {
          document.$cache();

          if (docIdx > -1) {
            store.documents = [
              ...documents.slice(0, docIdx),
              document,
              ...documents.slice(docIdx + 1)
            ];
          }

          if (!documents) {
            this.findAll();
          }
        }

        onAfterSaveDocument && onAfterSaveDocument(document, changedFields);
        store.isSavingDocument = false;
        setEditing && setEditing(false);
        delete store.editingDocument;
        delete store.newDocument;
      } catch (saveError) {
        if (saveError.message) message.error(saveError.message);
        message.error(saveError);
        store.isSavingDocument = false;
        throw saveError;
      }
    });
  };

  private cancelEdit = () => {
    const { onCancelAddNew, setEditing } = this.props;
    const store = this.store;
    const { documents, editingDocument, newDocument } = store;

    if (!newDocument && !editingDocument) {
      setEditing && setEditing(false);
      return;
    }

    if (newDocument) {
      onCancelAddNew && onCancelAddNew();
      setEditing && setEditing(false);
      delete store.newDocument;

      // Find on server
      if (!this.props.documents) {
        this.findAll();
      }
    } else if (editingDocument) {
      editingDocument.$revert();

      const docIdx = findIndex(documents, d => d.$id === editingDocument.$id);

      if (docIdx > -1) {
        store.documents = [
          ...documents.slice(0, docIdx),
          editingDocument,
          ...documents.slice(docIdx + 1)
        ];
      }

      setEditing && setEditing(false);
      delete store.editingDocument;
    }

    this.setState({});
  };

  private getColumns(newDocumentTable?: boolean): ColumnProps<Tyr.Document>[] {
    const {
      collection,
      actionIconType,
      pinActionsRight,
      actionHeaderLabel,
      actionTrigger,
      actionColumnClassName,
      notifyFilterExists
    } = this.props;

    const store = this.store;

    const {
      workingSearchValues,
      fields: columns,
      tableDefn,
      newDocument,
      editingDocument
    } = store;

    const localSearch = !!this.props.documents;
    const fieldCount = columns.length;
    const isEditingAnything = !!newDocumentTable || !!editingDocument;
    const allWidthsDefined = columns.some(c => c.width);
    let hasAnyFilter = false;

    const antColumns: ColumnProps<Tyr.Document>[] = columns.map(
      (column, columnIdx) => {
        let field: Tyr.FieldInstance | undefined = undefined;
        let pathName: string | undefined = undefined;
        let searchField: Tyr.FieldInstance | undefined = undefined;
        let searchPathName: string | undefined = undefined;

        if (column.field && (column.field as Tyr.FieldInstance).collection) {
          field = column.field as Tyr.FieldInstance;
          pathName = field.path;
        } else {
          pathName = getFieldName(column.field);
          field = pathName ? collection.paths[pathName] : undefined;
        }

        if (
          column.searchField &&
          (column.searchField as Tyr.FieldInstance).collection
        ) {
          searchField = column.searchField as Tyr.FieldInstance;
          searchPathName = searchField.path;
        } else {
          searchPathName = getFieldName(column.searchField);
          searchField = searchPathName
            ? collection.paths[searchPathName]
            : undefined;
        }

        if (field) (field as any).column = column;

        const fieldDefn = pathName && (tableDefn[pathName] as FieldDefinition);
        const { sortDirection } = fieldDefn || {
          sortDirection: undefined
        };

        const isLast = columnIdx === fieldCount - 1;
        const colWidth = isLast
          ? allWidthsDefined ? undefined : column.width
          : fieldCount > 1 ? column.width : undefined;

        const filterable = {
          searchValues: workingSearchValues,
          onFilterChange: () => {
            // TODO:  remove this hack once we upgrade to latest ant
            if (this._mounted) {
              this.setState({});
            }
          },
          onSearch: () => {
            if (!localSearch) {
              const defn: TableDefinition = {
                [pathName!]: {
                  ...((tableDefn[pathName!] as FieldDefinition) || {}),
                  searchValue: workingSearchValues[pathName!] || ''
                }
              };

              this.goToRoute(defn);
            }
          },
          localSearch,
          localDocuments: store.documents
        };

        const np = field ? field.namePath : undefined;
        const searchNp = searchField ? searchField.namePath : undefined;

        let sorter = undefined;

        if (!newDocumentTable) {
          if (column.sortComparator) {
            sorter = column.sortComparator;
          } else if (field) {
            sorter = (a: Tyr.Document, b: Tyr.Document) => {
              const av = np && np.get(a);
              const bv = np && np.get(b);

              return field!.type.compare(field!, av, bv);
            };
          }
        }

        const filteredValue = pathName
          ? filterable.searchValues[pathName]
          : undefined;

        hasAnyFilter = hasAnyFilter || filteredValue !== undefined;

        const sortingEnabled = !editingDocument && !newDocumentTable;
        const filteringEnabled = !newDocumentTable;

        return {
          dataIndex: pathName,
          //key: pathName,
          render: (text: string, doc: Tyr.Document) => {
            const editable = newDocumentTable || this.isEditing(doc);
            const document =
              editingDocument && doc.$id === editingDocument.$id
                ? editingDocument!
                : doc;

            if (
              editable &&
              !column.readonly &&
              (!column.isEditable || column.isEditable(document))
            ) {
              const fieldProps = {
                placeholder: column.placeholder,
                autoFocus: column.autoFocus,
                required: column.required,
                width: colWidth,
                multiple: column.multiple,
                mode: column.mode,
                searchOptionRenderer: column.searchOptionRenderer,
                searchSortById: column.searchSortById,
                renderField: column.renderField,
                renderDisplay: column.renderDisplay,
                noLabel: true,
                tabIndex: columnIdx,
                dropdownClassName: column.dropdownClassName,
                className: column.className,
                searchRange: column.searchRange,
                onChange: () => {
                  this.setState({});
                },
                typeUi: column.typeUi,
                mapDocumentValueToForm: column.mapDocumentValueToForm,
                mapFormValueToDocument: column.mapFormValueToDocument,
                getSearchIds: column.getSearchIds,
                labelInValue: column.labelInValue,
                onFilter: column.onFilter,
                dateFormat: column.dateFormat,
                linkLabels: column.linkLabels,
                max: column.max,
                label: column.label
              };

              return (
                <EditableContext.Consumer>
                  {({ form }) => {
                    if (!form || !pathName) return <span />;

                    return (
                      <TyrFieldBase
                        path={np!}
                        searchPath={searchNp}
                        form={form}
                        document={document}
                        {...fieldProps}
                      />
                    );
                  }}
                </EditableContext.Consumer>
              );
            }

            const render = column.renderDisplay;

            return (
              <div className="tyr-table-cell">
                {render
                  ? render(document)
                  : getCellValue(np!, document, column)}
              </div>
            );
          },
          sorter: sortingEnabled ? sorter : undefined,
          sortOrder: sortingEnabled ? sortDirection : undefined,
          title: column.label || (field && field.label),
          width: colWidth,
          className: column.className,
          ellipsis: column.ellipsis,
          ...(filteringEnabled && filteredValue
            ? { filteredValue: [filteredValue] }
            : {}),
          ...((filteringEnabled &&
            (!column.noFilter && np && getFilter(np, filterable, column))) ||
            {}),
          ...(!isEditingAnything && column.pinned && fieldCount > 1
            ? { fixed: column.pinned }
            : {}),
          ...(column.align ? { align: column.align } : {})
        };
      }
    );

    if (this.actions.length) {
      antColumns.push({
        key: '$actions',
        dataIndex: '$actions',
        align: 'center',
        className: `tyr-action-column${
          actionColumnClassName ? ' ' + actionColumnClassName : ''
        }`,
        title: !newDocumentTable ? actionHeaderLabel || '' : '',
        render: (text: string, doc: Tyr.Document) => {
          const editable = newDocumentTable || this.isEditing(doc);
          const document =
            editingDocument && doc.$id === editingDocument.$id
              ? editingDocument!
              : doc;

          if (editable) {
            if (store.isSavingDocument) {
              return <Spin tip="Saving..." />;
            }

            return (
              <div style={{ display: 'flex' }}>
                <Button
                  style={{ width: '60px', marginRight: 8, zIndex: 1 }}
                  size="small"
                  type="default"
                  onClick={() => this.cancelEdit()}
                >
                  Cancel
                </Button>

                <EditableContext.Consumer>
                  {({ form }) => {
                    if (!form) {
                      return <span>No Form!</span>;
                    }

                    return (
                      <Button
                        size="small"
                        style={{ width: '60px', zIndex: 1 }}
                        type="primary"
                        onClick={() => this.saveDocument(form, document)}
                      >
                        Save
                      </Button>
                    );
                  }}
                </EditableContext.Consumer>
              </div>
            );
          }

          if (newDocument) {
            return <span />;
          }

          const thisActions = this.actions.filter(
            action => !action.hide || !action.hide(document)
          );

          if (!thisActions.length) {
            return <span />;
          }

          if (this.actions.length === 1) {
            const action = this.actions[0];
            const label = action.label;

            if (label instanceof string) {
              return (
                <a
                  className="action-item"
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    action.act({ document });
                  }}
                >
                  {label}
                </a>
              );
            }

            return (
              <span
                className="action-item"
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  action.act({ document });
                }}
              >
                {action.label as React.ReactNode}
              </span>
            );
          }

          const menu = (
            <Menu className="tyr-menu">
              {thisActions.map(action => (
                <Menu.Item className="tyr-menu-item" key={action.name}>
                  <button onClick={() => action.act({ document })}>
                    {action.label}
                  </button>
                </Menu.Item>
              ))}
            </Menu>
          );

          return (
            <Dropdown overlay={menu} trigger={[actionTrigger || 'hover']}>
              <span className="tyr-menu-link">
                <Icon type={actionIconType || 'ellipsis'} />
              </span>
            </Dropdown>
          );
        },
        sorter: undefined,
        sortOrder: undefined,
        width: 40,
        ...(!isEditingAnything && !!pinActionsRight ? { fixed: 'right' } : {})
      });
    }

    if (notifyFilterExists) {
      setTimeout(() => notifyFilterExists(hasAnyFilter));
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
    extra: { currentDataSource: any[] }
  ) => {
    const store = this.store;

    delete store.editingDocument;
    delete store.newDocument;
    let defn: TableDefinition = {};

    if (pagination.current) {
      defn.skip = (pagination.current! - 1) * this.store.pageSize;
    }

    if (filters) {
      for (const pathName in filters) {
        defn[pathName] = {
          ...((store.tableDefn[pathName] as FieldDefinition) || {}),
          searchValue: filters[pathName].join('.'),
          sortDirection: undefined
        };
      }
    }

    const sortFieldName = sorter.columnKey;

    if (sortFieldName) {
      // table doesn't appear to support multiple sort columns currently, so unselect any existing sort
      for (const pathName in store.tableDefn) {
        if (pathName === 'skip' || pathName === 'limit') {
          continue;
        }

        if (pathName !== sortFieldName) {
          store.tableDefn[pathName] = undefined;
        } else {
          const fieldDefn = store.tableDefn[pathName] as FieldDefinition;

          if (fieldDefn && fieldDefn.sortDirection) {
            defn[pathName] = _.omit(fieldDefn, 'sortDirection');
          }
        }
      }

      defn[sortFieldName] = {
        ...((store.tableDefn[sortFieldName] as FieldDefinition) || {}),
        sortDirection: sorter.order
      };
    } else {
      for (const pathName in store.tableDefn) {
        if (pathName === 'skip' || pathName === 'limit') {
          continue;
        }
        store.tableDefn[pathName] = undefined;
      }
    }

    if (this.props.route) {
      this.goToRoute(defn);
    } else {
      store.tableDefn = { ...store.tableDefn, ...defn };

      if (this._mounted) {
        this.setSortedDocuments(this.store.documents.slice());
        this.setState({}); // Hack to force a table re-render
      }
    }

    this.props.notifySortSet &&
      this.props.notifySortSet(sortFieldName, sorter.order);
  };

  private paginationItemRenderer = (
    page: number,
    type: 'page' | 'prev' | 'next' | 'jump-prev' | 'jump-next',
    originalElement: React.ReactElement<HTMLElement>
  ) => {
    if (type === 'prev') {
      return <a>Previous</a>;
    }

    if (type === 'next') {
      return <a>Next</a>;
    }

    return originalElement;
  };

  private pagination = () => {
    if (this.props.pageSize === 0) {
      return undefined;
    }

    const store = this.store;
    const { skip = 0, limit = store.pageSize } = store.tableDefn;
    const totalCount = store.count || 0;

    // there appears to be a bug in ant table when you switch from paged to non-paging and then back again
    // (forces a 10 row page size) ?
    //return true || totalCount > this.store.pageSize
    return totalCount > store.pageSize
      ? {
          defaultCurrent: Math.floor(skip / limit) + 1,
          total: totalCount,
          defaultPageSize: limit,
          pageSize: limit,
          size: 'default',
          itemRender: this.paginationItemRenderer
        }
      : false;
  };

  private onEditRow = (document: Tyr.Document, rowIndex: number) => {
    this.store.editingDocument = document;
    this.props.setEditing && this.props.setEditing(true);
    document.$snapshot();
  };

  tableWrapper: React.RefObject<HTMLDivElement> | null = createRef();

  selectRow = (doc: Tyr.Document) => {
    const { onSelectRows } = this.props;
    const selectedRowKeys = [...this.store.selectedRowKeys];
    const key = doc.$id as string;

    if (selectedRowKeys.indexOf(key) >= 0) {
      selectedRowKeys.splice(selectedRowKeys.indexOf(key), 1);
    } else {
      selectedRowKeys.push(key);
    }

    this.store.selectedRowKeys = selectedRowKeys;
    onSelectRows && onSelectRows(selectedRowKeys);
  };

  onSelectedRowKeysChange = (selectedRowKeys: string[] | number[]) => {
    const { onSelectRows } = this.props;
    this.store.selectedRowKeys = selectedRowKeys as string[];
    onSelectRows && onSelectRows(selectedRowKeys as string[]);
  };

  closeConfigModal = () => {
    this.store.showConfig = false;
  };

  resetFiltersAndSort = () => {
    const { notifyFilterExists, notifySortSet } = this.props;
    this.store.workingSearchValues = {};

    const tableDefn = this.store.tableDefn;
    this.store.tableDefn = {
      ...(tableDefn.limit ? { limit: tableDefn.limit } : {}),
      ...(tableDefn.skip ? { skip: tableDefn.skip } : {})
    };

    this.setSortedDocuments(this.store.documents.slice());
    this.setState({});

    notifyFilterExists && notifyFilterExists(false);

    if (notifySortSet) {
      const sortColumn = this.props.fields.find(column => !!column.defaultSort);
      notifySortSet(
        sortColumn ? (sortColumn.field as string) : undefined,
        sortColumn ? sortColumn.defaultSort : undefined
      );
    }
  };

  moveRow = (dragIndex: number, hoverIndex: number) => {
    if (dragIndex === hoverIndex) return;

    const { moveRow } = this.props;
    const { documents } = this.store;

    const [removed] = documents.splice(dragIndex, 1);
    documents.splice(hoverIndex, 0, removed);
    this.store.documents = documents;
    this.setState({});

    moveRow && moveRow(dragIndex, hoverIndex);
  };

  render() {
    const {
      documents,
      loading,
      showConfig,
      fields,
      editingDocument,
      newDocument,
      selectedRowKeys
    } = this.store;
    const {
      className,
      children,
      rowEdit,
      canEditDocument,
      size,
      onActionLabelClick,
      scroll,
      footer,
      title,
      showHeader,
      config: tableConfig,
      onCancelAddNew,
      decorator,
      onSelectRows,
      orderable,
      pageSize
    } = this.props;

    const fieldCount = fields.length;
    const isEditingRow = !!editingDocument;
    const netClassName = `tyr-table${className ? ' ' + className : ''}${
      isEditingRow ? ' tyr-table-editing-row' : ''
    }`;

    const rowsSelectable = !!onSelectRows;

    return this.wrap(() => {
      if (decorator && (!this.decorator || !this.decorator.visible))
        return <div />;

      this.startFinding(); // want to delay finding until the control is actually shown

      const dndEnabled = !isEditingRow && !newDocument && orderable;

      const components = {
        body: {
          row:
            dndEnabled && dndBackend
              ? EditableDraggableBodyRow
              : EditableFormRow
        }
      };

      const mainTable = fields ? (
        <ObsTable
          rowSelection={
            rowsSelectable
              ? {
                  selectedRowKeys,
                  onChange: this.onSelectedRowKeysChange
                }
              : undefined
          }
          loading={loading || this.props.loading}
          components={components}
          rowKey={(doc: any) => doc.$id || doc.$id}
          size={size || 'small'}
          pagination={pageSize === 0 ? false : this.pagination()}
          onChange={this.handleTableChange}
          footer={footer}
          title={newDocument ? undefined : title}
          showHeader={newDocument ? false : showHeader}
          // TODO: get rid of slice() once we go to Mobx 5 */ documents.slice()
          dataSource={documents.slice()}
          columns={this.getColumns()}
          scroll={fieldCount > 1 ? scroll : undefined}
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
          onRow={(record, rowIndex) => {
            return {
              onClick: () => {
                rowsSelectable && this.selectRow(record);
              },

              index: rowIndex,
              moveRow: this.moveRow,
              dndEnabled,

              onDoubleClick: () => {
                if (
                  !editingDocument &&
                  rowEdit &&
                  record.$id &&
                  (!canEditDocument || canEditDocument(record))
                ) {
                  this.onEditRow(record, rowIndex);

                  if (newDocument) {
                    onCancelAddNew && onCancelAddNew();
                    delete this.store.newDocument;
                  }

                  if (this._mounted) {
                    this.setState({});
                  }
                }
              }
            };
          }}
        />
      ) : (
        undefined
      );

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
              {fields &&
                newDocument && (
                  <ObsTable
                    className="tyr-table-new-document"
                    loading={loading}
                    components={components}
                    rowKey={() => 'new'}
                    title={title}
                    size={size || 'small'}
                    pagination={false}
                    showHeader={true}
                    dataSource={[newDocument]}
                    columns={this.getColumns(true)}
                    scroll={fieldCount > 1 ? scroll : undefined}
                  />
                )}

              {fields && (
                <div
                  style={{
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  ref={this.tableWrapper}
                >
                  {dndBackend && (
                    <DragDropContextProvider backend={dndBackend}>
                      {mainTable}
                    </DragDropContextProvider>
                  )}
                  {!dndBackend && mainTable}
                </div>
              )}
              {showConfig &&
                tableConfig && (
                  <TyrTableConfigComponent
                    columns={this.props.fields}
                    config={tableConfig}
                    tableConfig={this.store.tableConfig}
                    onCancel={() => (this.store.showConfig = false)}
                    onUpdate={this.onUpdateTableConfig}
                    containerEl={this.tableWrapper!}
                  />
                )}
            </Col>
          </Row>
        </div>
      );
    });
  }
}

type TyrTableConfigField = {
  name: string;
  hidden?: boolean;
};

export type TyrTableConfigFields = TyrTableConfigField[];

type TyrTableConfigType = Tyr.Document & {
  key?: string;
  name?: string;
  fields: TyrTableConfigFields;
  documentUid: string;
  userId: string;
  collectionId: string;
};

type TyrTableConfigProps = {
  config: TyrTableConfig;
  tableConfig?: TyrTableConfigType;
  onCancel: () => void;
  onUpdate: (tableConfig: any) => void;
  columns: TyrTableColumnFieldProps[];
  containerEl: React.RefObject<HTMLDivElement>;
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

class TyrTableConfigComponent extends React.Component<
  TyrTableConfigProps,
  TyrTableConfigState
> {
  state: TyrTableConfigState = {
    columnFields: []
  };

  tableBody: HTMLElement | null = null;

  componentWillMount() {
    const {
      columns,
      config,
      tableConfig: incomingTableConfig,
      containerEl
    } = this.props;
    let tableConfig: TyrTableConfigType;

    if (incomingTableConfig) {
      tableConfig = incomingTableConfig;
    } else {
      const { documentUid, collectionId, userId } = config;
      const columnFields = compact(
        columns.map(c => getFieldName(c.field))
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

    const { collectionId } = tableConfig;
    const collection = Tyr.byId[collectionId];
    const orderedFields = orderedArray(tableConfig.fields, columns, true);

    const columnFields = compact(
      orderedFields.map((column: TyrTableColumnFieldProps, index: number) => {
        const savedField = tableConfig.fields.find(c => {
          if (column.field && (column.field as Tyr.FieldInstance).collection) {
            return c.name === (column.field as Tyr.FieldInstance).path;
          }

          return column.field === c.name;
        });
        const pathName = getFieldName(column!.field);

        if (pathName) {
          const field = pathName && collection.paths[pathName];
          const hidden = !!savedField
            ? !!savedField.hidden
            : !!column.defaultHidden;

          return {
            name: pathName,
            label: ((column && column.label) ||
              (field && field.label)) as string,
            locked: index < config.lockedLeft,
            hidden
          };
        }

        return null;
      })
    );

    if (config.asDrawer) {
      const container = ReactDOM.findDOMNode(containerEl!.current);
      this.tableBody = (container! as Element).querySelector(
        '.ant-table.ant-table-middle'
      ) as HTMLElement;
    }

    this.setState({
      tableConfig,
      columnFields: columnFields as ColumnConfigField[]
    });
  }

  private onSave = async () => {
    const { onUpdate, onCancel, tableConfig } = this.props;
    const { columnFields } = this.state;

    const newTableConfig = new Tyr.byName.tyrTableConfig({
      ...tableConfig,
      fields: columnFields
    });

    onUpdate(await newTableConfig.$save());
    onCancel();
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

  onDragEnd = (result: DropResult, provided: ResponderProvided) => {
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

  private renderBody = () => {
    const { config, tableConfig } = this.props;
    const { columnFields } = this.state;

    const lockedFields = columnFields.slice(0, config.lockedLeft);
    const draggableFields = columnFields.slice(
      config.lockedLeft,
      columnFields.length
    );

    return (
      <div>
        {!tableConfig && <span>No config!</span>}

        {config.header && config.header}

        {tableConfig && (
          <div className="tyr-config-columns-list tyr-config-columns-list-locked">
            {lockedFields.map(f => (
              <TyrTableColumnConfigItem
                key={f.name}
                field={f}
                compact={config.compact}
              />
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
                  className={`tyr-config-columns-list${
                    snapshot.isDraggingOver
                      ? ' tyr-config-columns-list-dragging'
                      : ''
                  }`}
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
                            compact={config.compact}
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
      </div>
    );
  };

  renderDrawerFooter() {
    const { onCancel } = this.props;

    return (
      <div className="tyr-footer" style={{ textAlign: 'center' }}>
        <Button key="back" onClick={onCancel}>
          Close
        </Button>
        <Button
          key="submit"
          type="primary"
          onClick={this.onSave}
          style={{ marginLeft: '10px' }}
        >
          Save
        </Button>
      </div>
    );
  }

  render() {
    const { onCancel, config } = this.props;

    if (config.asDrawer) {
      return (
        <Drawer
          title={
            <div style={{ textAlign: 'center' }}>
              {config.title || 'Edit Columns'}
            </div>
          }
          visible={true}
          closable={false}
          getContainer={this.tableBody!}
          placement="right"
          style={{ position: 'absolute', right: '1px' }}
          maskClosable={false}
          className="tyr-config-columns"
          destroyOnClose={false}
        >
          <div className="tyr-drawer-container">
            <div className="tyr-drawer">
              {this.renderBody()}
              {this.renderDrawerFooter()}
            </div>
          </div>
        </Drawer>
      );
    }

    return (
      <Modal
        className="tyr-modal tyr-config-columns"
        visible={true}
        onCancel={onCancel}
        onOk={this.onSave}
        okText="Save"
        cancelText="Cancel"
        title={config.title || 'Edit Columns'}
      >
        {this.renderBody()}
      </Modal>
    );
  }
}

const ensureTableConfig = async (
  columns: TyrTableColumnFieldProps[],
  config: TyrTableConfig,
  existingTableConfig?: any
) => {
  let tableConfig: TyrTableConfigType;

  if (existingTableConfig) {
    tableConfig = existingTableConfig;
  } else {
    const { documentUid, collectionId, userId, key } = config;

    if (!documentUid || !collectionId) {
      console.error(
        'Unable to load table configuration.  Need both the documentUid and the collectionId.'
      );
      return Promise.resolve(undefined);
    }

    tableConfig = (await Tyr.byName.tyrTableConfig.findOne({
      query: {
        userId,
        key,
        documentUid,
        collectionId
      }
    })) as TyrTableConfigType;

    if (!tableConfig) {
      tableConfig = new Tyr.byName.tyrTableConfig({
        documentUid,
        collectionId,
        userId,
        key,
        fields: columns.map(c => {
          return {
            name: c,
            hidden: !!c.defaultHidden
          };
        })
      }) as TyrTableConfigType;
    }
  }

  const orderedColumns = orderedArray(
    tableConfig.fields,
    columns.filter(column => {
      const fieldName = getFieldName(column.field);
      const configField = tableConfig.fields.find(f => f.name === fieldName);

      return fieldName && (!configField || !configField.hidden);
    })
  );

  return { tableConfig, newColumns: orderedColumns };
};

const orderedArray = (
  arrayWithOrder: { name: string }[],
  array: TyrTableColumnFieldProps[],
  includeHidden?: boolean
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
      } else if (!!includeHidden || !current.defaultHidden) {
        extra.push(current);
      }
    } else if (!!includeHidden || !current.defaultHidden) {
      extra.push(current);
    }

    arrayToOrder.splice(0, 1);
  }

  return compact([...orderedArray, ...extra]);
};

const fieldStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  width: '100%'
};

type TyrTableColumnConfigItemProps = {
  field: ColumnConfigField;
  provided?: DraggableProvided;
  snapshot?: DraggableStateSnapshot;
  onChangeVisibility?: (field: ColumnConfigField) => void;
  compact?: boolean;
};

const TyrTableColumnConfigItem = (props: TyrTableColumnConfigItemProps) => {
  const {
    field,
    provided,
    snapshot,
    onChangeVisibility,
    compact: small
  } = props;
  const { locked, name, label, hidden } = field;
  const isDragging = snapshot ? snapshot.isDragging : false;
  const innerRef = provided ? provided.innerRef : undefined;

  const getItemStyle = (draggableStyle: any) => ({
    userSelect: 'none',
    display: 'flex',
    alignItems: 'center',
    ...draggableStyle
  });

  return (
    <div
      ref={innerRef}
      className={`tyr-column-config-item${small ? ' compact' : ''}${
        hidden ? ' tyr-column-config-item-hidden' : ''
      }${locked ? ' tyr-column-config-item-locked' : ''}${
        isDragging ? ' tyr-column-config-item-dragging' : ''
      }`}
      key={name}
      {...(provided ? provided.draggableProps : {})}
      style={getItemStyle(provided ? provided.draggableProps.style : {})}
    >
      <div
        className={`tyr-column-config-item-handle${
          isDragging ? ' tyr-column-config-item-dragging' : ''
        }`}
        {...(provided ? provided.dragHandleProps : {})}
      >
        {!locked && <Icon type="menu" />}
      </div>
      <div className="tyr-column-config-item-inner" style={fieldStyle}>
        <span>
          <span className="tyr-column-config-item-label">{label}</span>
          {locked && (
            <span className="tyr-column-config-item-required-label">
              required
            </span>
          )}
        </span>
        {!locked && (
          <Switch
            className="tyr-column-config-item-toggle"
            checked={!hidden}
            onChange={() => onChangeVisibility && onChangeVisibility(field)}
          />
        )}
      </div>
    </div>
  );
};

export interface TyrTableControl {
  addNewDocument: (doc: Tyr.Document) => boolean;
  setFieldValue: (fieldName: string, value: any) => void;
  refresh: () => void;
  closeConfigModal: () => void;
  resetFiltersAndSort: () => void;
}

/**
  Control functions passed back to the table client
*/
class TyrTableControlImpl implements TyrTableControl {
  table: TyrTable;

  constructor(table: TyrTable) {
    this.table = table;
  }

  addNewDocument = (doc: Tyr.Document) => {
    return this.table.addNewDocument(doc);
  };

  setFieldValue = (fieldName: string, value: any) => {
    this.table.setFieldValue(fieldName, value);
  };

  refresh = () => {
    this.table.setState({});
  };

  closeConfigModal = () => {
    this.table.closeConfigModal();
  };

  resetFiltersAndSort = () => {
    this.table.resetFiltersAndSort();
  };
}

// EditableRow, DraggableRow, EditableDraggableRow

type BodyRowProps = {
  connectDragSource: (component: React.ReactNode) => React.ReactElement<any>;
  connectDropTarget: (component: React.ReactNode) => React.ReactElement<any>;
  moveRow: (dragIndex: number, hoverIndex: number) => void;
  isOver: boolean;
  isDragging: boolean;
  className: string;
  style: any;
  index: number;
  dndEnabled: boolean;
  form: WrappedFormUtils;
};

let draggingIndex = -1;

class BodyRow extends React.Component<BodyRowProps> {
  render() {
    const {
      isOver,
      connectDragSource,
      connectDropTarget,
      moveRow,
      form,
      dndEnabled,
      ...restProps
    } = this.props;

    const style = {
      ...restProps.style,
      cursor:
        dndEnabled && connectDragSource ? 'move' : form ? 'pointer' : 'default'
    };

    let { className } = restProps;
    if (isOver) {
      if (restProps.index > draggingIndex) {
        className += ' drop-over-downward';
      }
      if (restProps.index < draggingIndex) {
        className += ' drop-over-upward';
      }
    }

    // Just the edit row
    if (form && !connectDragSource) {
      return (
        <EditableContext.Provider value={{ form }}>
          <tr
            key={`form-${restProps.index}`}
            {...restProps}
            className={className}
            style={style}
          />
        </EditableContext.Provider>
      );
    }

    // Just the draggableRow
    if (connectDragSource && !form) {
      return connectDragSource(
        connectDropTarget(
          <tr
            key={`form-${restProps.index}`}
            {...restProps}
            className={className}
            style={style}
          />
        )
      );
    }

    // Both editable and draggable
    return (
      <EditableContext.Provider value={{ form }}>
        {connectDragSource(
          connectDropTarget(
            <tr
              key={`form-${restProps.index}`}
              {...restProps}
              className={className}
              style={style}
            />
          )
        )}
      </EditableContext.Provider>
    );
  }
}

const DraggableBodyRow = DropTarget(
  'row',
  {
    drop(props: BodyRowProps, monitor: DropTargetMonitor) {
      const dragIndex = (monitor.getItem() as BodyRowProps).index;
      const hoverIndex = props.index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Time to actually perform the action
      props.moveRow(dragIndex, hoverIndex);

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      (monitor.getItem() as BodyRowProps).index = hoverIndex;
    }
  },
  (connect, monitor) => ({
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver()
  })
)(
  DragSource(
    'row',
    {
      canDrag(props: BodyRowProps) {
        return props.dndEnabled;
      },

      beginDrag(props: BodyRowProps) {
        draggingIndex = props.index;
        return {
          index: props.index
        };
      }
    },
    connect => ({
      connectDragSource: connect.dragSource()
    })
  )(BodyRow)
);

const EditableFormRow = Form.create()(BodyRow);
const EditableDraggableBodyRow = Form.create()(DraggableBodyRow);
