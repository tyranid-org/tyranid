import { compact, findIndex, isEqual } from 'lodash';

import * as React from 'react';
import { createRef } from 'react';
import HTML5Backend from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';
import { Resizable, ResizableProps } from 'react-resizable';

import { observable } from 'mobx';
import { observer } from 'mobx-react';

import {
  MenuOutlined,
  DownloadOutlined,
  EllipsisOutlined,
} from '@ant-design/icons';

import { FormInstance } from 'antd/lib/form';
import { SizeType } from 'antd/lib/config-provider/SizeContext';
import {
  message,
  Button,
  Col,
  Dropdown,
  Menu,
  Row,
  Spin,
  Table,
  Tooltip,
} from 'antd';
import {
  ColumnType,
  ColumnProps,
  TableProps,
  ColumnGroupType,
} from 'antd/lib/table';
import { PaginationProps } from 'antd/es/pagination';

import { Tyr } from 'tyranid/client';

import { useThemeProps } from '../theme';
import { getCellValue, TyrTypeProps } from '../../type';
import { TyrActionBar } from '../action';
import { TyrComponentState, useComponent } from '../component';
import {
  getPathName,
  TyrThemedFieldBase,
  TyrPathProps,
  pathTitle,
  pathWidth,
} from '../path';
import { TyrSortDirection } from '../typedef';
import { TyrComponentConfigComponent } from '../component-config';
import { EditableFormRow, EditableContext, EditableCell } from './table-rows';
import { registerComponent } from '../../common';
import { TyrManyComponent, TyrManyComponentProps } from '../many-component';
import { classNames } from '../../util';
import { getLabelRenderer } from '../label';
import { ExpandableConfig } from 'antd/lib/table/interface';
import { TyrFilters } from '../filter';

const findColumnByDataIndex = <D extends Tyr.Document>(
  columns: (ColumnType<D> | ColumnGroupType<D>)[],
  dataIndex: string
): ColumnType<D> | undefined => {
  for (const c of columns) {
    if (c.dataIndex === dataIndex) return c;

    const { children } = c as ColumnGroupType<D>;
    if (children) {
      const cc = findColumnByDataIndex(children, dataIndex);
      if (cc) return cc;
    }
  }

  //return undefined;
};

// ant's ColumnGroupType has children has required which seems incorrect
export interface OurColumnProps<T> extends ColumnType<T> {
  path?: Tyr.PathInstance;
  children?: OurColumnProps<T>[];
}

const ObsTable = observer(Table);

export interface TyrTableProps<D extends Tyr.Document>
  extends TyrManyComponentProps<D> {
  //fixedWidthHack?: boolean;
  bordered?: boolean;
  filter?: boolean;
  collection: Tyr.CollectionInstance<D>;
  export?: boolean | { background?: boolean };
  actionHeaderLabel?: string | React.ReactNode;
  actionIcon?: Tyr.anny;
  actionTrigger?: 'hover' | 'click';
  actionColumnClassName?: string;
  pinActionsRight?: boolean;
  rowEdit?: boolean;
  emptyTablePlaceholder?:
    | React.ReactNode
    | ((tableControl: TyrTableBase<any>) => React.ReactNode);
  canEditDocument?: (document: D) => boolean;
  size?: SizeType;
  resizableColumns?: boolean;
  saveDocument?: (document: D) => Promise<D>;
  onAfterSaveDocument?: (document: D, changedFields?: string[]) => void;
  onBeforeSaveDocument?: (document: D) => boolean | undefined | void;
  onCancelAddNew?: () => void;
  onActionLabelClick?: () => void;
  scroll?: { x?: number | true | string; y?: number | string };
  footer?: (currentPageData: D[]) => React.ReactNode;
  onLoad?: (table: TyrTableBase<any>) => void;
  rowSelection?: boolean;
  loading?: boolean;
  setEditing?: (editing: boolean) => void;
  onSelectRows?: (selectedRowIds: string[]) => void;
  orderable?: boolean;
  moveRow?: (dragIndex: number, hoverIndex: number) => void;
  showHeader?: boolean;

  wrapColumnHeaders?: boolean;

  children?: React.ReactNode;
  expandable?: ExpandableConfig<D>;
}

// TODO:  if they specify a sort function for a column and we're not local report an error

@observer
export class TyrTableBase<
  D extends Tyr.Document = Tyr.Document
> extends TyrManyComponent<D, TyrTableProps<D>> {
  componentName = 'table';
  hasConfig = true;
  hasFilters = true;
  hasSortDirection = true;

  newDocument?: D;
  editingDocument?: D;
  isSavingDocument = false;

  @observable
  showConfig = false;

  @observable
  showExport = false;

  currentRowForm?: FormInstance;

  constructor(props: TyrTableProps<D>, state: TyrComponentState<D>) {
    super(props, state);
  }

  async componentDidMount() {
    await super.componentDidMount();

    this.props.onLoad?.(this);
  }

  UNSAFE_componentWillReceiveProps(nextProps: TyrTableProps<D>) {
    // ensure any paths in nextProps.paths are in this.otherPaths (add to end if not there)
    // remove any paths from this.otherPaths not in nextProps.paths
    const nextOtherPaths = nextProps.paths;

    // Replace all existing fields, and remove any not in new fields
    const newOtherPaths = compact(
      this._activePaths.map(otherPath => {
        const otherPathName = getPathName(otherPath.path);

        const p = nextOtherPaths!.find(
          column => otherPathName === getPathName(column)
        );

        return p ? this.resolveFieldLaxProps(p) : undefined;
      })
    ) as TyrPathProps<D>[];

    // Add any new fields (unless they are hidden)
    for (const nextOtherField of nextOtherPaths!) {
      const nextOtherFieldName = getPathName(nextOtherField);

      const existingCol = newOtherPaths.find(
        column => nextOtherFieldName === getPathName(column.path)
      );

      if (!existingCol) {
        const fld = this.componentConfig?.fields.find(
          f => f.name === nextOtherFieldName
        );

        // If it is hidden, then don't add it to my fields
        if (
          !fld?.hidden &&
          !(typeof nextOtherField !== 'string' && nextOtherField.defaultHidden)
        ) {
          newOtherPaths.push(this.resolveFieldLaxProps(nextOtherField));
        }
      }
    }

    this._activePaths = newOtherPaths;
    this.refreshPaths();
  }

  componentDidUpdate(prevProps: TyrTableProps<D>) {
    const { documents: newDocuments } = this.props;
    const { documents } = prevProps;

    if (documents && newDocuments) {
      if (this.props.orderable) {
        this.documents = newDocuments.slice();
        this.count = newDocuments.length;
      } else {
        if (!this.documents) {
          this.documents = newDocuments.slice();
          this.sort();
        } else {
          this.setStableDocuments(newDocuments.slice());
        }
      }
    }
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

    field.path.set(document, value);
  };

  addNewDocument = (doc: D) => {
    this.newDocument = doc;
    delete this.editingDocument;

    if (this.mounted) this.refresh();

    this.props.setEditing?.(true);
    return true;
  };

  private isEditing = (document: Tyr.Document) => {
    const { editingDocument } = this;

    return (
      !document.$id || (editingDocument && document.$id === editingDocument.$id)
    );
  };

  private stopEditing() {
    this.isSavingDocument = false;
    this.props.setEditing?.(false);
    delete this.editingDocument;
    delete this.newDocument;
  }

  private saveDocument = async (form: FormInstance) => {
    const {
      saveDocument,
      onAfterSaveDocument,
      onBeforeSaveDocument,
      setEditing,
    } = this.props;

    const { editingDocument, newDocument } = this;

    let document = newDocument || editingDocument;

    if (!document) {
      setEditing?.(false);
      message.error(`No document to save!`);
      return;
    }

    if (!document.$changed) {
      this.stopEditing();
      return;
    }

    this.isSavingDocument = true;
    const collection = document.$model;

    const orig = document.$orig;
    const changedFields: string[] = [];

    return new Promise(async (resolve, reject) => {
      try {
        /*const values: TyrFormFields = */ await form.validateFields(
          this.activePaths
            .map(path => path.path?.name)
            .filter(s => s) as string[]
        );

        // Don't think this is needed anymore
        // Plus, for some reason, field leafs are called, xxx_yyy in values,
        // not xxx.yyy - this causes field not to be found below

        // for (const pathName in values) {
        //   const value = values[pathName];
        //   const field = collection.paths[pathName];
        //   type.mapFormValueToDocument(field.path, value, document);
        // }

        if (orig) {
          for (const column of this.props.paths!) {
            const pathName = getPathName(column);
            const field = pathName && collection.paths[pathName];

            if (field) {
              const { path } = field;
              const oldValue = path.get(orig);
              const newValue = path.get(document);

              if (!isEqual(oldValue, newValue)) {
                if (
                  typeof column !== 'string' &&
                  typeof column.label === 'string'
                ) {
                  changedFields.push(column.label as string);
                } else if (typeof field.label === 'string') {
                  changedFields.push(field.label);
                }
              }
            }
          }
        }

        if (onBeforeSaveDocument && !onBeforeSaveDocument(document!)) {
          this.isSavingDocument = false;
          // No error to show, hopefully validation error is shown
          // or merror message by onBeforeSaveDocument
          return resolve();
        }

        document = await (saveDocument
          ? saveDocument(document!)
          : document!.$save());

        if (document) {
          document.$cache();

          if (this.local) {
            const { allDocuments } = this;
            const docIdx = findIndex(
              allDocuments!,
              d => d.$id === document!.$id
            );
            if (docIdx > -1) {
              this.allDocuments = [
                ...allDocuments!.slice(0, docIdx),
                document,
                ...allDocuments!.slice(docIdx + 1),
              ];
            } else {
              this.allDocuments!.push(document);
            }
          }

          await onAfterSaveDocument?.(document, changedFields);
          this.requery();
        }

        this.stopEditing();
        resolve();
      } catch (saveError) {
        if (saveError.message) message.error(saveError.message);
        message.error(saveError);
        this.isSavingDocument = false;
        reject(saveError);
      }
    });
  };

  private cancelEdit = () => {
    const { onCancelAddNew, setEditing } = this.props;
    const { documents, editingDocument, newDocument } = this;

    if (!newDocument && !editingDocument) {
      setEditing?.(false);
      return;
    }

    if (newDocument) {
      onCancelAddNew && onCancelAddNew();
      setEditing && setEditing(false);
      delete this.newDocument;
      this.requery();
    } else if (editingDocument) {
      editingDocument.$revert();

      const docIdx = findIndex(documents, d => d.$id === editingDocument.$id);

      if (docIdx > -1) {
        this.documents = [
          ...documents.slice(0, docIdx),
          editingDocument,
          ...documents.slice(docIdx + 1),
        ];
      }

      setEditing && setEditing(false);
      delete this.editingDocument;
    }

    this.refresh();
  };

  tableWidth: number = 0;

  private getColumns(newDocumentTable?: boolean): ColumnProps<D>[] {
    const {
      collection,
      actionIcon,
      pinActionsRight,
      actionHeaderLabel,
      actionTrigger,
      actionColumnClassName,
      notifyFilterExists,
      onActionLabelClick,
      config,
      wrapColumnHeaders,
      resizableColumns,
      onSelectRows,
    } = this.props;

    const {
      sortDirections,
      editingDocument,
      newDocument,
      local: isLocal,
    } = this;
    const columns = this.activePaths;

    const fieldCount = columns.length;
    const isEditingAnything = !!newDocument || !!editingDocument;
    let hasAnyFilter = false;

    const antColumns: OurColumnProps<D>[] = [];
    let curGroupName: string | undefined;
    let curGroupColumn: OurColumnProps<D>;

    const multiActions = this.actions.filter(
      a => a.input === '*' && a.hide !== true
    );

    const rowsSelectable =
      (!newDocument && onSelectRows) || multiActions.length;

    this.tableWidth =
      (rowsSelectable ? 60 : 0) +
      (isEditingAnything ? 128 : 0) +
      256 /* action bar */;

    const handleCellSave = () => {};

    columns.forEach((column, columnIdx) => {
      let path: Tyr.PathInstance | undefined;
      let pathName: string | undefined;
      let searchPath: Tyr.PathInstance | undefined;

      if (typeof column.path === 'string') {
        pathName = column.path;
        path = collection.parsePath(pathName);
      } else if (column.path) {
        path = column.path;
        pathName = path.name;
      }

      const isCellEditable = false; // CELL-EDIT !!column.isCellEditable;

      const width =
        column.tempWidth ||
        (pathName &&
          this.componentConfig?.fields.find(f => f.name === column.path?.name)
            ?.width) ||
        pathWidth(column, wrapColumnHeaders);

      this.tableWidth += width ? Number.parseInt(width as string) + 16 : 275;

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

      const filterValue = pathName ? this.filterValue(pathName) : undefined;

      hasAnyFilter = hasAnyFilter || filterValue !== undefined;

      const sortingEnabled = !editingDocument && !newDocumentTable;
      const filteringEnabled = !newDocumentTable;

      const filter =
        (filteringEnabled &&
          !column.noFilter &&
          path &&
          this.getFilter(column as any)) ||
        {};

      const netClassName = column.className;

      const renderFunction = (
        text: string,
        doc: D,
        isEditingCell?: boolean
      ) => {
        const editable =
          newDocumentTable || this.isEditing(doc) || isEditingCell;
        const document =
          editingDocument && doc.$id === editingDocument.$id
            ? editingDocument!
            : doc;

        if (
          editable &&
          column.mode !== 'view' &&
          (!column.isEditable || column.isEditable(document))
        ) {
          const fieldProps = {
            ...column,
            autoFocus: !!newDocumentTable && !!column.autoFocus,
            width,
            searchOptionRenderer: getLabelRenderer(column),
            noLabel: true,
            tabIndex: columnIdx,
            className: classNames(
              path && 'tyr-edit-' + path.detail.type.name,
              column.editClassName
            ),
            onChange: () => this.setState({}),
          };

          return (
            <EditableContext.Consumer>
              {({ form }) => {
                if (!form || !pathName) return <span />;

                return (
                  <TyrThemedFieldBase
                    path={path!}
                    searchPath={searchPath}
                    form={form}
                    document={document}
                    /*
                    CELL-EDIT
                    onBlur={e => {
                      this.saveDocument(form);
                    }}
                    */
                    {...fieldProps}
                  />
                );
              }}
            </EditableContext.Consumer>
          );
        }

        const render = column.renderDisplay;

        return (
          <div
            className={classNames(
              'tyr-table-cell',
              column.columnClassName && column.columnClassName(document)
            )}
          >
            {render
              ? render(document, path, column)
              : path
              ? getCellValue(path, document, column as TyrTypeProps<any>)
              : ''}
          </div>
        );
      };

      const tableColumn: OurColumnProps<D> = {
        dataIndex: pathName,
        //key: pathName,
        render: (text: string, doc: D) => renderFunction(text, doc),
        sorter: sortingEnabled ? sorter : undefined,
        sortOrder: sortingEnabled ? sortDirection : undefined,
        title: pathTitle(column),
        width,
        className: netClassName,
        ellipsis: column.ellipsis,
        /*
        CELL-EDIT
        onCell: record =>
          ({
            record,
            editable: !!isCellEditable,
            dataIndex: columnIdx,
            handleSave: handleCellSave,
            toggleEdit: (doc: D) => {
              this.onEditCell(doc, columnIdx);
            },
            render: renderFunction,
          } as React.HtmlHTMLAttributes<HTMLElement>),
          */
        ...(filteringEnabled && filterValue
          ? { filteredValue: [filterValue] }
          : { filteredValue: undefined }),
        ...filter,
        ...(!isEditingAnything && column.pinned && fieldCount > 1
          ? { fixed: column.pinned }
          : {}),
        ...(column.align ? { align: column.align } : {}),
        ...(resizableColumns
          ? {
              onHeaderCell: tableColumn =>
                ({
                  width,
                  // This is the same as onResize, except it saves the width
                  onResizeStop: (
                    e: MouseEvent,
                    opts: { size: { width?: number } }
                  ) => {
                    e.stopImmediatePropagation();
                    const { width } = opts.size;

                    if (width) {
                      // Clear out tempWidth (used during resizing)
                      column.tempWidth = 0;

                      column.width = width;
                      this.updateConfigWidths(pathName, width);
                      this.refresh();
                    }
                  },
                  onResize: (
                    e: MouseEvent,
                    opts: { size: { width?: number } }
                  ) => {
                    e.stopImmediatePropagation();
                    const { width } = opts.size;

                    if (width) {
                      // Set the temporary width
                      column.tempWidth = width;
                      this.refresh();
                    }
                  },
                } as any),
            }
          : {}),
        path,
      };

      const { group } = column;

      if (group) {
        if (curGroupName === group) {
          curGroupColumn.children!.push(tableColumn);
        } else {
          curGroupColumn = {
            title: group,
            children: [tableColumn],
          };
          curGroupName = group;

          antColumns.push(curGroupColumn);
        }
      } else {
        antColumns.push((tableColumn as unknown) as OurColumnProps<D>);
        curGroupName = undefined;
      }
    });

    //if (this.props.fixedWidthHack) this.applyFixedWidthHack(antColumns);

    const singularActions = this.actions.filter(a => a.input === 1);

    if (singularActions.length) {
      const actionRender = (text: string, doc: D) => {
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
            <div>
              <Button
                style={{ marginRight: 8, zIndex: 1 }}
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
                      style={{ zIndex: 1 }}
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
          // hide the actions when adding a new document
          return <span />;
        }

        const thisActions = singularActions.filter(
          action => !action.hide || !action.isHidden(document)
        );

        if (!thisActions.length) {
          return <span />;
        }

        if (this.actions.length === 1) {
          const action = this.actions[0];
          const label = action.label(this as any);

          if (typeof label === 'string') {
            return (
              <a
                style={{ whiteSpace: 'nowrap' }}
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
              {label as React.ReactNode}
            </span>
          );
        }

        const menu = (
          <Menu className="tyr-menu">
            {thisActions.map(action => (
              <Menu.Item className="tyr-menu-item" key={action.name}>
                {action.renderFrom(this, { document })}
              </Menu.Item>
            ))}
          </Menu>
        );

        return (
          <Dropdown overlay={menu} trigger={[actionTrigger || 'click']}>
            <span className="tyr-menu-link">
              {actionIcon || <EllipsisOutlined />}
            </span>
          </Dropdown>
        );
      };

      antColumns.push({
        key: '$actions',
        dataIndex: '$actions',
        align: 'center',
        onHeaderCell: props => {
          if (props.key === '$actions' && !!config) {
            return {
              onClick: () => {
                onActionLabelClick?.();
                this.showConfig = true;
              },
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
                <MenuOutlined className="tyr-table-config-icon" />
              </Tooltip>
            )
          : '',

        /*
        CELL-EDIT
        onCell: record =>
          ({
            record,
            editable: false,
            dataIndex: antColumns.length,
            render: actionRender,
          } as React.HtmlHTMLAttributes<HTMLElement>),
        */
        render: actionRender,
        sorter: undefined,
        sortOrder: undefined,
        width: isEditingAnything ? 112 : 32,
        ...(pinActionsRight !== false ? { fixed: 'right' } : {}),
      });
    }

    if (notifyFilterExists) {
      setTimeout(() => notifyFilterExists(hasAnyFilter));
    }

    return antColumns as ColumnType<D>[];
  }

  private handleTableChange = (
    paginationNotUsed: PaginationProps,
    filters: { [pathName: string]: string[] },
    sorter: {
      order?: TyrSortDirection;
      field: string;
    },
    extra: { currentDataSource: any[] }
  ) => {
    const { sortDirections } = this;

    delete this.editingDocument;
    delete this.newDocument;

    const sortFieldName = sorter.field;

    // unselect any existing sort until we add support for multiple column sorting
    for (const pathName in sortDirections) {
      if (pathName !== sortFieldName) {
        delete sortDirections[pathName];
      }
    }

    if (!sortDirections[sortFieldName] && !sorter.order)
      sorter.order = 'ascend';

    if (sorter.order) {
      this.updateConfigSort(sortFieldName, sorter.order);
      sortDirections[sortFieldName] = sorter.order!;
    } else {
      this.resetSort();
    }

    this.query();
    this.props.notifySortSet?.(sortFieldName, sorter.order);
  };

  private onEditRow = (document: D, rowIndex: number) => {
    this.editingDocument = document;
    this.props.setEditing?.(true);
    document.$snapshot();
  };

  private onEditCell = (document: D, colIndex: number) => {
    this.editingDocument = document;
    this.props.setEditing?.(true);
    document.$snapshot();
  };

  //rerenderTable?: RerenderableApi;
  tableWrapper: React.RefObject<HTMLDivElement> | null = createRef();

  selectRow = (doc: D) => {
    const { onSelectRows } = this.props;
    const selectedRowKeys = [...this.selectedIds];
    const key = doc.$id as string;

    if (selectedRowKeys.indexOf(key) >= 0) {
      selectedRowKeys.splice(selectedRowKeys.indexOf(key), 1);
    } else {
      selectedRowKeys.push(key);
    }

    this.selectedIds = selectedRowKeys;
    onSelectRows?.(selectedRowKeys);
  };

  onSelectedRowKeysChange = (selectedRowKeys: Tyr.AnyIdType[]) => {
    const { onSelectRows } = this.props;
    this.selectedIds = selectedRowKeys as string[];
    onSelectRows?.(selectedRowKeys as string[]);
  };

  closeConfigModal = () => (this.showConfig = false);

  setSelectedRows = (ids: string[]) => (this.selectedIds = ids);

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
      editingDocument,
      newDocument,
      activePaths: paths,
      showConfig,
      showExport,
      selectedIds: selectedRowKeys,
      loading,
    } = this;
    const {
      bordered,
      className,
      rowEdit,
      setEditing,
      export: exportProp,
      canEditDocument,
      size,
      scroll,
      footer,
      config: componentConfig,
      decorator,
      onSelectRows,
      orderable,
      rowSelection,
      emptyTablePlaceholder,
      resizableColumns,
      expandable,
    } = this.props;

    const fieldCount = paths.length;
    const isEditingRow = !!editingDocument;
    const netClassName = `tyr-table${className ? ' ' + className : ''}${
      isEditingRow ? ' tyr-table-editing-row' : ''
    }${newDocument ? ' tyr-table-adding-row' : ''}`;

    const multiActions = this.actions.filter(
      a => a.input === '*' && a.hide !== true
    );
    const rowsSelectable =
      (!newDocument && onSelectRows) || multiActions.length;

    return this.wrap(() => {
      if (decorator && (!this.decorator || !this.decorator.visible))
        return <div />;

      this.activate(); // want to delay finding until the control is actually shown

      const dndEnabled = !isEditingRow && !newDocument && orderable;

      const components: TableProps<any>['components'] = {
        body: {
          row: EditableFormRow as any,
          /*
          CELL_EDIT
          cell: EditableCell,
          */
        },
      };

      if (resizableColumns) {
        components.header = {
          cell: ResizableTitle,
        };
      }

      const netFooter = (docs: D[]) => (
        <>
          {this.quickTotalComponent()}
          {this.paginationComponent()}
          <div className="tyr-footer-btns">
            <TyrActionBar component={this} utility={true} />
            {exportProp && (
              <Button onClick={() => (this.showExport = true)}>
                <DownloadOutlined /> Export
              </Button>
            )}
            {footer?.(docs)}
          </div>
        </>
      );

      const emptyText = loading
        ? ''
        : typeof emptyTablePlaceholder === 'function'
        ? emptyTablePlaceholder(this)
        : emptyTablePlaceholder;

      const tableScroll =
        fieldCount > 1
          ? scroll
            ? { ...scroll, x: this.tableWidth }
            : { x: this.tableWidth }
          : undefined;

      const mainTable = paths ? (
        <ObsTable
          locale={{ emptyText }}
          bordered={bordered}
          rowSelection={
            rowsSelectable
              ? {
                  selectedRowKeys,
                  onChange: this.onSelectedRowKeysChange,
                  columnWidth: 32,
                }
              : undefined
          }
          loading={!!loading || this.props.loading}
          components={components}
          rowKey={(doc: any) => doc.$id || doc.$id}
          size={size || 'small'}
          pagination={false}
          onChange={this.handleTableChange as any}
          footer={netFooter as (rows: Object[]) => React.ReactNode}
          showHeader={!newDocument && this.props.showHeader !== false}
          dataSource={loading ? [] : this.currentPageDocuments()}
          columns={this.getColumns()}
          scroll={tableScroll}
          {...(expandable ? { expandable } : {})}
          onRow={(record: any, rowIndex: any) => ({
            onClick: () => {
              !!rowSelection && rowsSelectable && this.selectRow(record);
            },

            index: rowIndex,
            moveRow: this.moveRow,
            dndEnabled,
            className:
              editingDocument?.$id === record.$id
                ? 'tyr-editable-row'
                : undefined,

            onDoubleClick: async () => {
              if (
                rowEdit &&
                record.$id &&
                (!canEditDocument || canEditDocument(record as any)) &&
                rowIndex !== undefined
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
            },
          })}
        />
      ) : undefined;

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
          {this.props.filter && <TyrFilters component={this} />}
          <TyrActionBar component={this} />
          <Row>
            <Col span={24}>
              {paths && newDocument && (
                <ObsTable
                  bordered={bordered}
                  className="tyr-table-new-document"
                  loading={!!loading}
                  components={components}
                  rowKey={() => 'new'}
                  size={size || 'small'}
                  pagination={false}
                  showHeader={true}
                  dataSource={[newDocument]}
                  columns={this.getColumns(true)}
                  scroll={tableScroll}
                />
              )}
              {paths && (!newDocument || !!this.documents.length) && (
                <div
                  style={{
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  ref={this.tableWrapper}
                >
                  {dndEnabled ? (
                    <DndProvider backend={HTML5Backend}>
                      {mainTable}
                    </DndProvider>
                  ) : (
                    mainTable
                  )}
                </div>
              )}
              {showConfig && componentConfig && (
                <TyrComponentConfigComponent
                  component={this}
                  columns={this.paths}
                  config={componentConfig}
                  componentConfig={this.componentConfig}
                  originalPaths={this.props.paths!}
                  onCancel={() => (this.showConfig = false)}
                  onUpdate={this.onUpdateComponentConfig}
                  containerEl={this.tableWrapper!}
                />
              )}
              {showExport && this.mounted && (
                <TyrComponentConfigComponent
                  component={this}
                  columns={this.paths}
                  config={componentConfig || true}
                  originalPaths={this.props.paths!}
                  export={this.props.export || true}
                  componentConfig={this.componentConfig}
                  onCancel={() => (this.showExport = false)}
                  onUpdate={this.onUpdateComponentConfig}
                  containerEl={this.tableWrapper!}
                />
              )}
            </Col>
          </Row>
          {this.props.children}
        </div>
      );
    });
  }

  /*
   * Currently in ant tables, if you have a fixed height (scroll: { y: something } ), it messes up the column headers, and you need to make sure
   * that every column header/cell has a width and a min-width ... search for "width not working?" on ant table webpage for more information
   */
  /*
  applyFixedWidthHack(columns: OurColumnProps<D>[]) {
    function classify(column: OurColumnProps<D>) {
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
  */
}

export const TyrTable = <D extends Tyr.Document>(props: TyrTableProps<D>) => (
  <TyrTableBase
    {...useThemeProps('table', props as TyrTableProps<D>)}
    parent={useComponent()}
  />
);

const ResizableTitle = (props: ResizableProps & { onClick?: any }) => {
  const { onResize, onResizeStop, width, ...restProps } = props;
  const [resizing, setResizing] = React.useState(false);

  if (!width) {
    return <th {...restProps} />;
  }

  return (
    <Resizable
      width={width}
      height={0}
      handle={
        <span
          className={`react-resizable-handle react-resizable-handle-se`}
          onClick={e => {
            e.stopPropagation();
            return false;
          }}
        />
      }
      onResizeStart={() => {
        setResizing(true);
      }}
      onResizeStop={(...args) => {
        setTimeout(() => {
          setResizing(false);
          onResizeStop && onResizeStop(...args);
        });
      }}
      onResize={onResize}
      draggableOpts={{ enableUserSelectHack: false }}
    >
      <th
        {...restProps}
        onClick={(...args) => {
          // This will prevent a sort occuring after mouse up from a resize
          if (!resizing && props.onClick) {
            props.onClick(...args);
          }
        }}
      />
    </Resizable>
  );
};

registerComponent('TyrTable', TyrTable);
