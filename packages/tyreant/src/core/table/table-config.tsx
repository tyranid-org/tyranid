import * as React from 'react';
import { useEffect, useState } from 'react';

import * as ReactDOM from 'react-dom';

import { Modal, Button, Drawer } from 'antd';
import { Tyr } from 'tyranid/client';
import { compact, findIndex } from 'lodash';

import { getFieldName } from '../field';

import {
  TyrTableConfigType,
  TyrTableConfig,
  TyrTableColumnFieldProps,
  ColumnConfigField
} from './typedef';

import {
  DragDropContext,
  Draggable,
  Droppable,
  DropResult,
  ResponderProvided
} from 'react-beautiful-dnd';

import TyrTableColumnConfigItem from './table-config-item';
import { TyrTable } from './table';

interface TyrTableConfigProps<D extends Tyr.Document> {
  table: TyrTable<D>;
  config:
    | TyrTableConfig
    | string /* the key */
    | true /* if true, key is "default" */;
  export?: boolean;
  tableConfig?: TyrTableConfigType;
  onCancel: () => void;
  onUpdate: (tableConfig: any) => void;
  columns: TyrTableColumnFieldProps[];
  containerEl: React.RefObject<HTMLDivElement>;
}

const TyrTableConfigComponent = <D extends Tyr.Document>({
  table,
  config: rawConfig,
  export: exportProp,
  tableConfig: incomingTableConfig,
  onCancel,
  onUpdate,
  columns,
  containerEl
}: TyrTableConfigProps<D>) => {
  const [columnFields, setColumnFields] = useState([] as ColumnConfigField[]);
  let tableBody: HTMLElement | null = null;

  if (typeof rawConfig === 'boolean' && rawConfig) rawConfig = 'default';
  const config =
    typeof rawConfig === 'string'
      ? ({
          key: rawConfig
        } as TyrTableConfig)
      : rawConfig;

  const lockedLeft = config.lockedLeft || 0;

  const { collection } = table;

  // Only runs once
  useEffect(() => {
    let tableConfig: TyrTableConfigType;
    const userId = Tyr.local.user.$id;

    if (incomingTableConfig) {
      tableConfig = incomingTableConfig;
    } else {
      const { documentUid } = config;
      const columnFields = compact(
        columns.map(c => getFieldName(c.field))
      ) as string[];
      tableConfig = new Tyr.byName.tyrTableConfig({
        documentUid,
        collection: collection.id,
        userId,
        fields: columnFields.map(c => {
          return {
            name: c
          };
        })
      }) as any;
    }

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
            locked: index < lockedLeft,
            hidden
          };
        }

        return null;
      })
    );

    if (config.asDrawer) {
      const container = ReactDOM.findDOMNode(containerEl!.current);
      tableBody = (container! as Element).querySelector(
        '.ant-table.ant-table-middle'
      ) as HTMLElement;
    }

    setColumnFields(columnFields as ColumnConfigField[]);
  }, []);

  const onSave = async () => {
    const newTableConfig = new Tyr.byName.tyrTableConfig({
      ...incomingTableConfig,
      fields: columnFields
    });

    onUpdate(await newTableConfig.$save());
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

  const renderDrawerFooter = () => {
    return (
      <div className="tyr-footer" style={{ textAlign: 'center' }}>
        <Button key="back" onClick={onCancel}>
          Close
        </Button>
        {actionButton}
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
            {renderDrawerFooter()}
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
      footer={
        <>
          <Button key="back" onClick={onCancel}>
            Cancel
          </Button>
          {actionButton}
        </>
      }
    >
      {renderBody()}
    </Modal>
  );
};

export const ensureTableConfig = async <D extends Tyr.Document>(
  table: TyrTable<D>,
  columns: TyrTableColumnFieldProps[],
  config: TyrTableConfig | string | boolean,
  existingTableConfig?: any
) => {
  let tableConfig: TyrTableConfigType;

  if (typeof config === 'boolean') config = 'default';
  if (typeof config === 'string') config = { key: config };

  if (existingTableConfig) {
    tableConfig = existingTableConfig;
  } else {
    const { documentUid, key } = config;

    const userId = Tyr.local.user.$id;

    tableConfig = (await Tyr.byName.tyrTableConfig.findOne({
      query: {
        userId,
        key,
        documentUid: documentUid || { $exists: false },
        collectionId: table.collection.id
      }
    })) as TyrTableConfigType;

    if (!tableConfig) {
      tableConfig = new Tyr.byName.tyrTableConfig({
        documentUid,
        collectionId: table.collection.id,
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

      return fieldName ? !configField || !configField.hidden : undefined;
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
