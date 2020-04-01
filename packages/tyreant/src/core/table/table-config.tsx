import * as React from 'react';
import { useEffect, useState } from 'react';
import * as ReactDOM from 'react-dom';
import {
  DragDropContext,
  Draggable,
  Droppable,
  DropResult,
  ResponderProvided
} from 'react-beautiful-dnd';

import { compact, findIndex } from 'lodash';

import { Modal, Button, Drawer, Breadcrumb, message } from 'antd';

import { Tyr } from 'tyranid/client';

import { getPathName } from '../path';
import { TyrTableConfig, ColumnConfigField } from './typedef';
import TyrTableColumnConfigItem from './table-config-item';
import {
  TyrTableBase,
  TyrTableColumnPathProps,
  TyrTableColumnPathLaxProps
} from './table';

interface TyrTableConfigProps<D extends Tyr.Document> {
  table: TyrTableBase<D>;
  config:
    | TyrTableConfig
    | string /* the key */
    | true /* if true, key is "default" */;
  export?: boolean;
  tableConfig?: Tyr.TyrComponentConfig;
  originalPaths: TyrTableColumnPathLaxProps[];
  onCancel: () => void;
  onUpdate: (
    tableConfig: Tyr.TyrComponentConfig,
    sortHasBeenReset?: boolean,
    filtersHaveBeenReset?: boolean
  ) => void;
  columns: TyrTableColumnPathProps[];
  containerEl: React.RefObject<HTMLDivElement>;
}

const TyrTableConfigComponent = <D extends Tyr.Document>({
  table,
  config: rawConfig,
  export: exportProp,
  tableConfig: incomingTableConfig,
  originalPaths,
  onCancel,
  onUpdate,
  columns,
  containerEl
}: TyrTableConfigProps<D>) => {
  const [columnFields, setColumnFields] = useState([] as ColumnConfigField[]);
  const [doResetSort, setDoResetSort] = useState(false);
  const [doResetFilters, setDoResetFilters] = useState(false);

  let tableBody: HTMLElement | null = null;

  if (typeof rawConfig === 'boolean' && rawConfig) {
    rawConfig = 'default';
  }

  const config =
    typeof rawConfig === 'string'
      ? ({
          key: rawConfig
        } as TyrTableConfig)
      : (rawConfig as TyrTableConfig);

  const lockedLeft = config.lockedLeft || 0;

  const { collection } = table;

  const getColumnFields = (
    fields: TyrTableColumnPathProps[],
    tableConfig: Tyr.TyrComponentConfig
  ) => {
    return compact(
      fields.map((column: TyrTableColumnPathProps, index: number) => {
        const savedField = tableConfig.fields.find(
          c => c.name === column.path?.name
        );
        const pathName = column.path?.name;

        if (pathName) {
          const hidden = !!savedField
            ? !!savedField.hidden
            : !!column.defaultHidden;

          return {
            name: pathName,
            label: column.path?.label || '?',
            locked: index < lockedLeft,
            sortDirection: savedField?.sortDirection,
            hasFilter: !!savedField?.filter,
            hidden
          };
        }

        return null;
      })
    );
  };
  // Only runs once
  useEffect(() => {
    let tableConfig: Tyr.TyrComponentConfig;
    const userId = Tyr.local.user.$id;

    if (incomingTableConfig) {
      tableConfig = incomingTableConfig;
    } else {
      const { documentUid } = config;
      const columnFields = compact(
        columns.map(c => getPathName(c.path))
      ) as string[];

      const { TyrComponentConfig } = Tyr.collections;
      tableConfig = new TyrComponentConfig({
        documentUid,
        collection: collection.id,
        userId,
        fields: columnFields.map(c => {
          return {
            name: c
          };
        })
      });
    }

    const orderedFields = orderedArray(tableConfig.fields, columns, true);
    const columnFields = getColumnFields(orderedFields, tableConfig);

    if (config.asDrawer) {
      const container = ReactDOM.findDOMNode(containerEl!.current);
      tableBody = (container! as Element).querySelector(
        '.ant-table.ant-table-middle'
      ) as HTMLElement;
    }

    setColumnFields(columnFields as ColumnConfigField[]);
  }, []);

  const onSave = async () => {
    const { TyrComponentConfig } = Tyr.collections;
    const newTableConfig = new TyrComponentConfig({
      ...incomingTableConfig,
      fields: columnFields
    });

    onUpdate(await newTableConfig.$save(), doResetSort, doResetFilters);
    onCancel();
  };

  const reorder = (list: any[], startIndex: number, endIndex: number) => {
    const lockedItems = Array.from(list.slice(0, lockedLeft));
    const orderableItems = Array.from(list.slice(lockedLeft, list.length));
    const [removed] = orderableItems.splice(startIndex, 1);
    orderableItems.splice(endIndex, 0, removed);

    return [...lockedItems, ...orderableItems];
  };

  const onDragEnd = (result: DropResult, provided: ResponderProvided) => {
    // dropped outside the list
    if (!result.destination) {
      return;
    }

    setColumnFields(
      reorder(columnFields, result.source.index, result.destination.index)
    );
  };

  const onChangeVisibility = (field: ColumnConfigField) => {
    const columnField = columnFields.find(df => df.name === field.name);

    if (columnField) {
      columnField.hidden = !columnField.hidden;
      setColumnFields(columnFields.slice());
    }
  };

  const resetSort = () => {
    const defaultSort = originalPaths.find(p => !!p.defaultSort);
    const defSortPath = defaultSort ? getPathName(defaultSort.path) : undefined;

    setColumnFields(
      columnFields.map(c => {
        if (c.name === defSortPath) {
          c.sortDirection = defaultSort?.defaultSort;
        } else {
          delete c.sortDirection;
        }

        return c;
      })
    );

    message.success('Sort has been reset.');
    setDoResetSort(true);
  };

  const resetFilters = () => {
    setColumnFields(
      columnFields.map(c => {
        delete c.hasFilter;
        return c;
      })
    );

    message.success('Filters have been reset.');
    setDoResetFilters(true);
  };

  const resetOrder = () => {
    const newColumnFields = originalPaths.map((p, idx) => {
      let path: Tyr.PathInstance | undefined;
      let pathName: string | undefined;

      if (typeof p.path === 'string') {
        pathName = p.path;
        path = collection.parsePath(pathName);
      } else if (p.path) {
        path = p.path;
        pathName = path.name;
      }

      const configField = columnFields.find(c => c.name == pathName);

      return {
        name: p.path,
        hidden: p.defaultHidden,
        label: path?.label || '?',
        locked: idx < lockedLeft,
        sortDirection: configField ? configField.sortDirection : undefined,
        hasFilter: configField ? configField.hasFilter : undefined
      };
    });

    setColumnFields(newColumnFields as ColumnConfigField[]);
    message.success('Column order has been reset.');
  };

  const renderBody = () => {
    const lockedFields = columnFields.slice(0, lockedLeft);
    const draggableFields = columnFields.slice(lockedLeft, columnFields.length);

    return (
      <div>
        {!incomingTableConfig && <span>No config!</span>}

        {exportProp ? 'Include data from ...' : config.header}

        {incomingTableConfig && (
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

        {incomingTableConfig && (
          <DragDropContext onDragEnd={onDragEnd}>
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
                            onChangeVisibility={onChangeVisibility}
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

  const actionLabel = exportProp ? 'Export' : 'Save';
  const actionButton = exportProp ? (
    <a
      className="ant-btn ant-btn-primary tyr-link-btn"
      href={`/api/${collection.def.name}/export?opts=${encodeURIComponent(
        JSON.stringify({
          query: table.findOpts?.query,
          fields: columnFields.filter(f => !f.hidden).map(f => f.name)
        })
      )}`}
      role="button"
      onClick={onCancel}
      target="_blank"
      download={Tyr.pluralize(collection.label.toLowerCase()) + '.csv'}
    >
      {actionLabel}
    </a>
  ) : (
    <Button
      key="submit"
      type="primary"
      onClick={onSave}
      style={{ marginLeft: '10px' }}
    >
      {actionLabel}
    </Button>
  );

  const renderFooter = () => {
    return (
      <div className="tyr-footer-container">
        <div className="left-side">
          {!(rawConfig as TyrTableConfig).hideReset && (
            <ResetArea
              resetSort={resetSort}
              resetFilters={resetFilters}
              resetOrder={resetOrder}
            />
          )}
        </div>
        <div className="right-side">
          <Button key="back" onClick={onCancel}>
            Cancel
          </Button>
          {actionButton}
        </div>
      </div>
    );
  };

  const title = exportProp
    ? Tyr.pluralize(collection.label) + ' CSV Exporter'
    : config.title || 'Edit Columns';

  if (config.asDrawer) {
    return (
      <Drawer
        title={<div style={{ textAlign: 'center' }}>{title}</div>}
        visible={true}
        closable={false}
        getContainer={tableBody!}
        placement="right"
        style={{ position: 'absolute', right: '1px' }}
        maskClosable={false}
        className="tyr-config-columns"
        destroyOnClose={false}
      >
        <div className="tyr-drawer-container">
          <div className="tyr-drawer">
            {renderBody()}
            {renderFooter()}
          </div>
        </div>
      </Drawer>
    );
  }

  return (
    <Modal
      className="tyr-modal tyr-config-columns"
      visible={true}
      title={title}
      onCancel={onCancel}
      footer={renderFooter()}
    >
      {renderBody()}
    </Modal>
  );
};

const ResetArea = (props: {
  resetSort: () => void;
  resetFilters: () => void;
  resetOrder: () => void;
}) => {
  const { resetSort, resetFilters, resetOrder } = props;

  return (
    <span className="reset-line">
      <span className="reset-label">Reset:</span>
      <Breadcrumb separator="|">
        <Breadcrumb.Item>
          <Button key="sort" type="link" onClick={resetSort}>
            Sort
          </Button>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Button key="link" type="link" onClick={resetFilters}>
            Filters
          </Button>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Button key="order" type="link" onClick={resetOrder}>
            Order
          </Button>
        </Breadcrumb.Item>
      </Breadcrumb>
    </span>
  );
};

export const ensureTableConfig = async <D extends Tyr.Document>(
  table: TyrTableBase<D>,
  columns: TyrTableColumnPathProps[],
  config: TyrTableConfig | string | boolean,
  existingTableConfig?: Tyr.TyrComponentConfig
) => {
  let tableConfig: Tyr.TyrComponentConfig;
  const { TyrComponentConfig } = Tyr.collections;

  if (typeof config === 'boolean') {
    config = 'default';
  }

  if (typeof config === 'string') {
    config = { key: config };
  }

  if (existingTableConfig) {
    tableConfig = existingTableConfig;
  } else {
    const { documentUid, key } = config;
    const userId = Tyr.local.user.$id;

    tableConfig = (await TyrComponentConfig.findOne({
      query: {
        name: 'table',
        userId,
        key,
        documentUid: documentUid || { $exists: false },
        collectionId: table.collection.id
      }
    }))!;

    if (!tableConfig) {
      tableConfig = new TyrComponentConfig({
        name: 'table',
        documentUid,
        collectionId: table.collection.id,
        userId,
        key,
        fields: columns.map(c => {
          return {
            name: getPathName(c.path),
            hidden: !!c.defaultHidden,
            sortDirection: c.defaultSort ? c.defaultSort : undefined,
            filter: c.defaultFilter ? c.defaultFilter : undefined
          };
        })
      })!;

      tableConfig = await TyrComponentConfig.save(tableConfig);
    }
  }

  const orderedColumns = orderedArray(
    tableConfig.fields,
    columns.filter(column => {
      const fieldName = getPathName(column.path);
      const configField = tableConfig.fields.find(f => f.name === fieldName);

      return fieldName ? !configField || !configField.hidden : undefined;
    })
  );

  return { tableConfig, newColumns: orderedColumns };
};

const orderedArray = (
  arrayWithOrder: { name: string }[],
  array: TyrTableColumnPathProps[],
  includeHidden?: boolean
) => {
  const arrayToOrder = [...array];
  const orderedArray: TyrTableColumnPathProps[] = [];
  const extra: TyrTableColumnPathProps[] = [];

  while (arrayToOrder.length) {
    const current = arrayToOrder[0];
    const fieldName = getPathName(current.path);

    if (fieldName) {
      const index = findIndex(arrayWithOrder, f => f.name === fieldName);

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

export default TyrTableConfigComponent;
