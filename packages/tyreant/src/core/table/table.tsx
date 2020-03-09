/*
 - Add resizeable columns: "re-resizable": "4.4.4",
   - https://ant.design/components/table/#components-table-demo-resizable-column
   - store in tableConfig
 - store filters in tableConfig
 - store sort in tableConfig
 
*/

import { compact, findIndex, isEqual } from 'lodash';

import * as React from 'react';
import { createRef } from 'react';
import { DragDropContextProvider } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';

import { observable } from 'mobx';
import { observer } from 'mobx-react';

import {
  message,
  Button,
  Col,
  Dropdown,
  Icon,
  Menu,
  Row,
  Spin,
  Table,
  Tooltip
} from 'antd';

import { PaginationProps } from 'antd/es/pagination';
import { WrappedFormUtils } from 'antd/lib/form/Form';
import { ColumnProps } from 'antd/es/table';
import { Tyr } from 'tyranid/client';

// TODO:  is it possible to import this via tsconfig ?
import 'tyranid/builtin/isomorphic';
import 'tyranid/builtin/client';

import { getCellValue, TyrTypeProps } from '../../type';
import { TyrComponentState } from '../component';
import {
  TyrSortDirection,
  TyrPathLaxProps,
  getPathName,
  TyrFieldBase
} from '../path';
import { TyrFormFields } from '../form';
import { TyrTableConfig } from './typedef';
import TyrTableConfigComponent, { ensureTableConfig } from './table-config';
import {
  EditableFormRow,
  EditableDraggableBodyRow,
  EditableContext
} from './table-rows';
import { registerComponent } from '../../common';
import { TyrManyComponent, TyrManyComponentProps } from '../many-component';
import { TyrPathProps } from '../../core';

export interface OurColumnProps<T> extends ColumnProps<T> {
  path: Tyr.NamePathInstance;
}

const ObsTable = observer(Table);

let dndBackend: __ReactDnd.Backend;

interface TableColumnPathProps {
  pinned?: 'left' | 'right';
  align?: 'left' | 'right' | 'center';
  ellipsis?: boolean;
  editClassName?: string;

  /**
   * What table column grouping should this be grouped under.
   */
  group?: string;
}

export type TyrTableColumnPathLaxProps = TableColumnPathProps & TyrPathLaxProps;
export type TyrTableColumnPathProps = TableColumnPathProps & TyrPathProps;

export interface TyrTableProps<D extends Tyr.Document>
  extends TyrManyComponentProps<D> {
  fixedWidthHack?: boolean;
  bordered?: boolean;
  collection: Tyr.CollectionInstance<D>;
  export?: boolean;
  paths: TyrTableColumnPathLaxProps[];
  actionHeaderLabel?: string | React.ReactNode;
  actionIconType?: string;
  actionTrigger?: 'hover' | 'click';
  actionColumnClassName?: string;
  pinActionsRight?: boolean;
  rowEdit?: boolean;
  emptyTablePlaceholder?:
    | React.ReactNode
    | ((tableControl: TyrTable<Tyr.anny>) => React.ReactNode);
  canEditDocument?: (document: D) => boolean;
  size?: 'default' | 'middle' | 'small';
  saveDocument?: (document: D) => Promise<D>;
  onAfterSaveDocument?: (document: D, changedFields?: string[]) => void;
  onBeforeSaveDocument?: (document: D) => boolean | undefined | void;
  onCancelAddNew?: () => void;
  onActionLabelClick?: () => void;
  onChangeTableConfiguration?: (fields: Tyr.TyrTableConfig['fields']) => void;
  scroll?: {
    x?: boolean | number | string;
    y?: boolean | number | string;
  };
  footer?: (currentPageData: D[]) => React.ReactNode;
  title?: (currentPageData: D[]) => React.ReactNode;
  showHeader?: boolean;
  /**
   * If a string is specified, it is the name of the key to use.
   * If true is specified, a key of 'default' will be used.
   */
  config?: TyrTableConfig | string | boolean;
  onLoad?: (table: TyrTable<Tyr.anny>) => void;
  rowSelection?: boolean;
  loading?: boolean;
  setEditing?: (editing: boolean) => void;
  onSelectRows?: (selectedRowIds: string[]) => void;
  orderable?: boolean;
  dndBackend?: __ReactDnd.Backend;
  moveRow?: (dragIndex: number, hoverIndex: number) => void;
}

// TODO:  if they specify a sort function for a column and we're not local report an error

@observer
export class TyrTable<
  D extends Tyr.Document = Tyr.Document
> extends TyrManyComponent<D, TyrTableProps<D>> {
  // TODO:  is this redundant with super().fields ?
  @observable
  otherPaths: TyrTableColumnPathProps[] = [];

  get activePaths(): TyrTableColumnPathProps[] {
    return this.otherPaths;
  }

  newDocument?: D;

  @observable
  selectedRowKeys: string[] = [];

  editingDocument?: D;

  isSavingDocument = false;

  @observable
  showConfig = false;

  @observable
  showExport = false;

  @observable
  tableConfig?: Tyr.TyrTableConfig;

  currentRowForm?: WrappedFormUtils;

  constructor(props: TyrTableProps<D>, state: TyrComponentState<D>) {
    super(props, state);
  }

  async componentDidMount() {
    super.componentDidMount();

    const { orderable } = this.props;

    if (orderable && !dndBackend)
      dndBackend = this.props.dndBackend || HTML5Backend;

    const { config, onLoad } = this.props;

    if (config) {
      this.loading = true;
      const existingConfig = await ensureTableConfig(this, this.paths, config);

      if (existingConfig) {
        this.otherPaths = existingConfig.newColumns;
        this.tableConfig = existingConfig.tableConfig;
      } else {
        this.otherPaths = this.paths;
      }

      this.loading = false;
    } else {
      this.otherPaths = this.paths;
    }

    onLoad && onLoad(this);
  }

  UNSAFE_componentWillReceiveProps(nextProps: TyrTableProps<D>) {
    const { documents } = this.props;
    const { documents: newDocuments } = nextProps;

    if (documents && newDocuments) {
      if (this.props.orderable) {
        this.documents = newDocuments;
        this.count = newDocuments.length;
      } else {
        this.setSortedDocuments(newDocuments);
      }
    }

    // ensure any paths in nextProps.paths are in this.otherPaths (add to end it not there)
    // remove any paths from this.otherPaths not in nextProps.paths

    const nextOtherPaths = nextProps.paths;
    // Replace all existing fields, and remove any not in new fields
    const newOtherPaths = compact(
      this.otherPaths.map(otherPath => {
        const otherPathName = getPathName(otherPath.path);

        const p = nextOtherPaths.find(
          column => otherPathName === getPathName(column.path)
        );

        return p ? this.resolveFieldLaxProps(p) : undefined;
      })
    ) as TyrTableColumnPathProps[];

    // Add any new fields (unless they are hidden)
    for (const nextOtherField of nextOtherPaths) {
      const nextOtherFieldName = getPathName(nextOtherField.path);

      const existingCol = newOtherPaths.find(
        column => nextOtherFieldName === getPathName(column.path)
      );

      if (!existingCol) {
        const fld = this.tableConfig?.fields.find(
          f => f.name === nextOtherFieldName
        );

        // If it is hidden, then don't add it to my fields
        if (!fld?.hidden && !nextOtherField.defaultHidden) {
          newOtherPaths.push(this.resolveFieldLaxProps(nextOtherField));
        }
      }
    }

    this.otherPaths = newOtherPaths;
  }

  setFieldValue = (fieldName: string, value: any) => {
    const document = this.newDocument || this.editingDocument;

    if (!document) {
      console.error(
        'Unable to setFieldValue, there is no document available to set a value in!'
      );
      return;
    }

    const pathName = getPathName(fieldName);
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

  addNewDocument = (doc: D) => {
    this.newDocument = doc;
    delete this.editingDocument;

    if (this.mounted) this.refresh();

    this.props.setEditing && this.props.setEditing(true);
    return true;
  };

  private onUpdateTableConfig = async (savedTableConfig: any) => {
    const { config, onChangeTableConfiguration } = this.props;

    if (config) {
      const tableConfig = await ensureTableConfig(
        this,
        this.paths,
        config,
        savedTableConfig
      );

      if (tableConfig) {
        this.tableConfig = tableConfig.tableConfig;
        this.otherPaths = tableConfig.newColumns;

        onChangeTableConfiguration &&
          onChangeTableConfiguration(
            (tableConfig.tableConfig as any).fields.map(
              (f: Tyr.TyrTableConfig['fields'][0]) => {
                return {
                  name: f.name,
                  hidden: !!f.hidden
                };
              }
            )
          );
      }
    }
  };

  private isEditing = (document: Tyr.Document) => {
    const { editingDocument } = this;

    return (
      !document.$id || (editingDocument && document.$id === editingDocument.$id)
    );
  };

  private saveDocument = async (form: WrappedFormUtils) => {
    const {
      saveDocument,
      onAfterSaveDocument,
      onBeforeSaveDocument,
      setEditing
    } = this.props;

    const { documents, editingDocument, newDocument } = this;

    let document = newDocument || editingDocument;

    if (!document) {
      setEditing && setEditing(false);
      message.error(`No document to save!`);
      return;
    }

    this.isSavingDocument = true;
    const docIdx = findIndex(documents, d => d.$id === document!.$id);
    const collection = document.$model;

    const orig = document.$orig;
    const changedFields: string[] = [];

    return new Promise((resolve, reject) => {
      form.validateFields(async (err: Error, values: TyrFormFields) => {
        try {
          if (err || !document) {
            this.isSavingDocument = false;
            return resolve();
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
            for (const column of this.props.paths) {
              const pathName = getPathName(column.path);
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

          const canSave =
            !onBeforeSaveDocument || onBeforeSaveDocument(document);

          if (!canSave) {
            this.isSavingDocument = false;
            // No error to show, hopefully validation error is shown
            // or merror message by onBeforeSaveDocument
            return resolve();
          }

          if (saveDocument) {
            document = await saveDocument(document);
          } else {
            document = await document.$save();
          }

          if (document) {
            document.$cache();

            if (docIdx > -1) {
              this.documents = [
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
          this.isSavingDocument = false;
          setEditing && setEditing(false);
          delete this.editingDocument;
          delete this.newDocument;
          resolve();
        } catch (saveError) {
          if (saveError.message) message.error(saveError.message);
          message.error(saveError);
          this.isSavingDocument = false;
          reject(saveError);
        }
      });
    });
  };

  private cancelEdit = () => {
    const { onCancelAddNew, setEditing } = this.props;
    const { documents, editingDocument, newDocument } = this;

    if (!newDocument && !editingDocument) {
      setEditing && setEditing(false);
      return;
    }

    if (newDocument) {
      onCancelAddNew && onCancelAddNew();
      setEditing && setEditing(false);
      delete this.newDocument;

      if (!this.isLocal) {
        this.findAll();
      }
    } else if (editingDocument) {
      editingDocument.$revert();

      const docIdx = findIndex(documents, d => d.$id === editingDocument.$id);

      if (docIdx > -1) {
        this.documents = [
          ...documents.slice(0, docIdx),
          editingDocument,
          ...documents.slice(docIdx + 1)
        ];
      }

      setEditing && setEditing(false);
      delete this.editingDocument;
    }

    this.setState({});
  };

  private getColumns(newDocumentTable?: boolean): ColumnProps<D>[] {
    const {
      collection,
      actionIconType,
      pinActionsRight,
      actionHeaderLabel,
      actionTrigger,
      actionColumnClassName,
      notifyFilterExists,
      onActionLabelClick,
      config
    } = this.props;

    const { sortDirections, editingDocument, newDocument, isLocal } = this;
    const columns = this.activePaths;

    const fieldCount = columns.length;
    const isEditingAnything = !!newDocumentTable || !!editingDocument;
    const allWidthsDefined = columns.some(c => c.width);
    let hasAnyFilter = false;

    const antColumns: ColumnProps<D>[] = [];
    let curGroupColumn: ColumnProps<D>;
    let curGroupName: string | undefined;

    columns.forEach((column, columnIdx) => {
      let path: Tyr.NamePathInstance | undefined;
      let pathName: string | undefined;
      let searchPath: Tyr.NamePathInstance | undefined;

      if (typeof column.path === 'string') {
        pathName = column.path;
        path = collection.parsePath(pathName);
      } else if (column.path) {
        path = column.path;
        pathName = path.name;
      }

      switch (typeof column.searchPath) {
        case 'string':
          searchPath = collection.parsePath(column.searchPath);
          break;
        case 'object':
          searchPath = column.searchPath;
          break;
        default:
          searchPath = undefined;
      }

      // TODO:  find another way to do this, paths are shared objects so should be immutable
      if (path) (path as any).column = column;

      const sortDirection = pathName ? sortDirections[pathName] : undefined;

      const isLast = columnIdx === fieldCount - 1;
      const colWidth = isLast
        ? allWidthsDefined
          ? undefined
          : column.width
        : fieldCount > 1
        ? column.width
        : undefined;

      let sorter;

      if (!newDocumentTable) {
        if (column.sortComparator) {
          sorter = column.sortComparator;
        } else if (path) {
          const pathField = path.detail;
          // TODO:  can remove this restriction if a denormalized value is available or if
          //        we convert findAll() to be an aggregation that links to the foreign keys
          if (isLocal || (!pathField.link && !pathField.of?.link))
            sorter = (a: Tyr.Document, b: Tyr.Document) =>
              pathField.type.compare(pathField, path!.get(a), path!.get(b));
        }
      }

      const filteredValue = pathName ? this.searchValues[pathName] : undefined;

      hasAnyFilter = hasAnyFilter || filteredValue !== undefined;

      const sortingEnabled = !editingDocument && !newDocumentTable;
      const filteringEnabled = !newDocumentTable;

      const filter =
        (filteringEnabled &&
          !column.noFilter &&
          path &&
          this.getFilter(column as any)) ||
        {};

      const netClassName = column.className;
      //if (colWidth && !editable && !fixedLeft && !fixedRight && !no fixed headers ) {

      //}

      const tableColumn = {
        dataIndex: pathName,
        //key: pathName,
        render: (text: string, doc: D) => {
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
              autoFocus: !!newDocumentTable && !!column.autoFocus,
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
              className: column.editClassName,
              searchRange: column.searchRange,
              onChange: () => this.setState({}),
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
                      path={path!}
                      searchPath={searchPath}
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
                : getCellValue(path!, document, column as TyrTypeProps)}
            </div>
          );
        },
        sorter: sortingEnabled ? sorter : undefined,
        sortOrder: sortingEnabled ? sortDirection : undefined,
        title: column.label || path?.pathLabel,
        width: colWidth,
        className: netClassName,
        ellipsis: column.ellipsis,
        ...(filteringEnabled && filteredValue
          ? { filteredValue: [filteredValue] }
          : { filteredValue: [] }),
        ...filter,
        ...(!isEditingAnything && column.pinned && fieldCount > 1
          ? { fixed: column.pinned }
          : {}),
        ...(column.align ? { align: column.align } : {}),
        path
      };

      const { group } = column;

      if (group) {
        if (curGroupName === group) {
          curGroupColumn.children!.push(tableColumn);
        } else {
          curGroupColumn = {
            title: group,
            children: [tableColumn]
          };
          curGroupName = group;

          antColumns.push(curGroupColumn);
        }
      } else {
        antColumns.push(tableColumn);
        curGroupName = undefined;
      }
    });

    if (this.props.fixedWidthHack) this.applyFixedWidthHack(antColumns);

    const singularActions = this.actions.filter(a => a.input === 1);
    if (singularActions.length) {
      antColumns.push({
        key: '$actions',
        dataIndex: '$actions',
        align: 'center',
        onHeaderCell: (props: ColumnProps<D>) => {
          if (props.key === '$actions' && !!config) {
            return {
              onClick: () => {
                onActionLabelClick?.();
                this.showConfig = true;
              }
            };
          }

          return {};
        },

        className: `tyr-action-column${
          actionColumnClassName ? ' ' + actionColumnClassName : ''
        }`,
        title: !newDocumentTable
          ? actionHeaderLabel || (
              <Tooltip title="Edit Columns">
                <Icon type="menu" />
              </Tooltip>
            )
          : '',
        render: (text: string, doc: D) => {
          const editable = newDocumentTable || this.isEditing(doc);
          const document =
            editingDocument && doc.$id === editingDocument.$id
              ? editingDocument!
              : doc;

          if (editable) {
            if (this.isSavingDocument) {
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

                    this.currentRowForm = form;

                    return (
                      <Button
                        size="small"
                        style={{ width: '60px', zIndex: 1 }}
                        type="primary"
                        onClick={() => this.saveDocument(form)}
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
            // Room for the save/cancel buttons, so column is same width
            return <span style={{ width: '128px', display: 'inline-block' }} />;
          }

          const thisActions = singularActions.filter(
            action => !action.hide || !action.hide(document)
          );

          if (!thisActions.length) {
            return <span />;
          }

          if (this.actions.length === 1) {
            const action = this.actions[0];
            const label = action.label;

            if (typeof label === 'string') {
              return (
                <a
                  className="action-item"
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    action.act({ caller: this, document });
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
                  action.act({ caller: this, document });
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
                  <button
                    onClick={() => action.act({ caller: this, document })}
                  >
                    {action.label}
                  </button>
                </Menu.Item>
              ))}
            </Menu>
          );

          return (
            <Dropdown overlay={menu} trigger={[actionTrigger || 'click']}>
              <span className="tyr-menu-link">
                <Icon type={actionIconType || 'ellipsis'} />
              </span>
            </Dropdown>
          );
        },
        sorter: undefined,
        sortOrder: undefined,
        width: 40,
        ...(pinActionsRight !== false ? { fixed: 'right' } : {})
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
    const { sortDirections } = this;

    delete this.editingDocument;
    delete this.newDocument;

    if (pagination.current) this.skip = (pagination.current! - 1) * this.limit;

    const { pageSize } = pagination;
    if (pageSize !== this.limit) this.limit = pageSize || this.defaultPageSize;

    const sortFieldName = sorter.columnKey;

    // table doesn't appear to support multiple sort columns currently, so unselect any existing sort
    for (const pathName in sortDirections) {
      if (pathName !== sortFieldName) {
        delete sortDirections[pathName];
      }
    }
    sortDirections[sortFieldName] = sorter.order!;

    this.execute();

    this.props.notifySortSet?.(sortFieldName, sorter.order);
  };

  private onEditRow = (document: D, rowIndex: number) => {
    this.editingDocument = document;
    this.props.setEditing && this.props.setEditing(true);
    document.$snapshot();

    // Trigger redraw
    setTimeout(() => {
      this.setState({});
    }, 250);
  };

  tableWrapper: React.RefObject<HTMLDivElement> | null = createRef();

  selectRow = (doc: D) => {
    const { onSelectRows } = this.props;
    const selectedRowKeys = [...this.selectedRowKeys];
    const key = doc.$id as string;

    if (selectedRowKeys.indexOf(key) >= 0) {
      selectedRowKeys.splice(selectedRowKeys.indexOf(key), 1);
    } else {
      selectedRowKeys.push(key);
    }

    this.selectedRowKeys = selectedRowKeys;
    onSelectRows && onSelectRows(selectedRowKeys);
  };

  onSelectedRowKeysChange = (selectedRowKeys: string[] | number[]) => {
    const { onSelectRows } = this.props;
    this.selectedRowKeys = selectedRowKeys as string[];
    onSelectRows?.(selectedRowKeys as string[]);
  };

  closeConfigModal = () => {
    this.showConfig = false;
  };

  setSelectedRows = (ids: string[]) => {
    this.selectedRowKeys = ids;
  };

  moveRow = (dragIndex: number, hoverIndex: number) => {
    if (dragIndex === hoverIndex) return;

    const { moveRow } = this.props;
    const { documents } = this;

    const [removed] = documents.splice(dragIndex, 1);
    documents.splice(hoverIndex, 0, removed);
    this.documents = documents;
    this.setState({});

    moveRow && moveRow(dragIndex, hoverIndex);
  };

  render() {
    const {
      documents,
      editingDocument,
      newDocument,
      activePaths: paths,
      showConfig,
      showExport,
      selectedRowKeys,
      loading
    } = this;
    const {
      bordered,
      className,
      children,
      rowEdit,
      setEditing,
      export: exportProp,
      canEditDocument,
      size,
      scroll,
      footer,
      title,
      showHeader,
      config: tableConfig,
      decorator,
      onSelectRows,
      orderable,
      rowSelection,
      emptyTablePlaceholder
    } = this.props;

    const fieldCount = paths.length;
    const isEditingRow = !!editingDocument;
    const netClassName = `tyr-table${className ? ' ' + className : ''}${
      isEditingRow ? ' tyr-table-editing-row' : ''
    }`;

    const multiActions = this.actions.filter(a => a.input === '*');
    const voidActions = this.actions.filter(a => a.input === 0);
    const rowsSelectable =
      (!newDocument && onSelectRows) || multiActions.length;

    return this.wrap(() => {
      if (decorator && (!this.decorator || !this.decorator.visible))
        return <div />;

      this.startReacting(); // want to delay finding until the control is actually shown

      const dndEnabled = !isEditingRow && !newDocument && orderable;

      const components = {
        body: {
          row:
            dndEnabled && dndBackend
              ? EditableDraggableBodyRow
              : EditableFormRow
        }
      };

      let netFooter = footer;

      if (exportProp) {
        netFooter = (docs: D[]) => (
          <>
            <Button onClick={() => (this.showExport = true)}>
              <Icon type="upload" /> Export
            </Button>
            {footer?.(docs)}
          </>
        );
      }
      const emptyText =
        typeof emptyTablePlaceholder === 'function'
          ? emptyTablePlaceholder(this)
          : emptyTablePlaceholder;

      const mainTable = paths ? (
        <ObsTable
          locale={{ emptyText }}
          bordered={bordered}
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
          pagination={this.pagination()}
          onChange={this.handleTableChange as any}
          footer={netFooter as (rows: Object[]) => React.ReactNode}
          title={
            newDocument
              ? undefined
              : (title as (rows: Object[]) => React.ReactNode)
          }
          showHeader={newDocument ? false : showHeader}
          // TODO: get rid of slice() once we go to Mobx 5 */ documents.slice()
          dataSource={documents.slice()}
          columns={this.getColumns()}
          scroll={fieldCount > 1 ? scroll : undefined}
          onRow={(record, rowIndex) => {
            return {
              onClick: () => {
                !!rowSelection && rowsSelectable && this.selectRow(record);
              },

              index: rowIndex,
              moveRow: this.moveRow,
              dndEnabled,
              className:
                editingDocument && editingDocument.$id === record.$id
                  ? 'tyr-editable-row'
                  : undefined,

              onDoubleClick: async () => {
                if (
                  rowEdit &&
                  record.$id &&
                  (!canEditDocument || canEditDocument(record as any))
                ) {
                  if ((editingDocument || newDocument) && this.currentRowForm) {
                    if (
                      editingDocument?.$id === record.$id ||
                      newDocument?.$id === record.$id
                    ) {
                      // same document
                      return;
                    }

                    await this.saveDocument(this.currentRowForm);
                  }

                  this.onEditRow(record, rowIndex);

                  if (this.mounted) {
                    setTimeout(() => this.refresh(), 400);
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
        <div
          className={netClassName}
          tabIndex={-1}
          onKeyDown={e => {
            if (e.keyCode === 13 && this.currentRowForm) {
              if (newDocument || editingDocument) {
                this.saveDocument(this.currentRowForm);
              } else {
                setEditing && setEditing(false);
              }
            }
          }}
        >
          {(children || multiActions.length > 0 || voidActions.length > 0) && (
            <Row>
              <Col span={24} className="tyr-table-header">
                {children}
                {multiActions.map(a => (
                  <Button
                    disabled={!this.selectedRowKeys?.length}
                    key={`a_${a.name}`}
                    onClick={() =>
                      a.act({
                        caller: this,
                        documents: this.selectedRowKeys.map(
                          id => this.collection!.byIdIndex[id]
                        ) as D[]
                      })
                    }
                  >
                    {a.label}
                  </Button>
                ))}
                {voidActions.map(a => (
                  <Button
                    key={`a_${a.name}`}
                    onClick={() => a.act({ caller: this })}
                  >
                    {a.label}
                  </Button>
                ))}
              </Col>
            </Row>
          )}
          <Row>
            <Col span={24}>
              {paths && newDocument && (
                <ObsTable
                  bordered={bordered}
                  className="tyr-table-new-document"
                  loading={loading}
                  components={components}
                  rowKey={() => 'new'}
                  title={title as (docs: Object[]) => React.ReactNode}
                  size={size || 'small'}
                  pagination={false}
                  showHeader={true}
                  dataSource={[newDocument]}
                  columns={this.getColumns(true)}
                  scroll={fieldCount > 1 ? scroll : undefined}
                />
              )}
              {paths && (
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
              {showConfig && tableConfig && (
                <TyrTableConfigComponent
                  table={this}
                  columns={this.paths}
                  config={tableConfig}
                  tableConfig={this.tableConfig}
                  onCancel={() => (this.showConfig = false)}
                  onUpdate={this.onUpdateTableConfig}
                  containerEl={this.tableWrapper!}
                />
              )}
              {showExport && this.mounted && (
                <TyrTableConfigComponent
                  table={this}
                  columns={this.paths}
                  config={tableConfig || true}
                  export={true}
                  tableConfig={this.tableConfig}
                  onCancel={() => (this.showExport = false)}
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

  /*
   * Currently in ant tables, if you have a fixed height (scroll: { y: something } }, it messes up the column headers, and you need to make sure
   * that every column header/cell has a width and a min-width ... search for "width not working?" on ant table webpage for more information
   */
  applyFixedWidthHack(columns: ColumnProps<D>[]) {
    function classify(column: ColumnProps<D>) {
      let defaultWidth;

      // TODO:  move this type of functionality to the type class
      switch ((column as OurColumnProps<D>).path?.detail.type.name) {
        case 'boolean':
        case 'double':
        case 'integer':
          defaultWidth = 100;
          break;
        case 'date':
        case 'time':
          defaultWidth = 120;
          break;
        case 'datetime':
          defaultWidth = 240;
          break;
        case 'string':
          defaultWidth = 120;
          break;
        default:
          defaultWidth = 120;
      }

      const { width: cwidth } = column;
      const width =
        (typeof cwidth === 'string'
          ? parseInt(cwidth || '' + defaultWidth, 10)
          : (cwidth as number)) || defaultWidth;
      delete column.width;
      const className = 'td-width td-width-' + width;
      column.className = column.className
        ? column.className + ' ' + className
        : className;

      if (width > 2000 || width % 20)
        throw new Tyr.AppError(
          `fixed width hack width of ${width} not supported`
        );

      return width;
    }

    for (const column of columns) {
      const { children } = column;

      if (children) {
        let sum = 0;
        for (const child of children) sum += classify(child);
        column.width = sum;
        classify(column);
      } else {
        classify(column);
      }
    }
  }
}

registerComponent('TyrTable', TyrTable);
