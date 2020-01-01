import * as React from 'react';
import { Icon, Switch } from 'antd';

import { DraggableProvided, DraggableStateSnapshot } from 'react-beautiful-dnd';

import { ColumnConfigField } from './typedef';

const fieldStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  width: '100%'
};

const itemStyle = {
  userSelect: 'none',
  display: 'flex',
  alignItems: 'center'
};

interface TyrTableColumnConfigItemProps {
  field: ColumnConfigField;
  provided?: DraggableProvided;
  snapshot?: DraggableStateSnapshot;
  onChangeVisibility?: (field: ColumnConfigField) => void;
  compact?: boolean;
}

const TyrTableColumnConfigItem = ({
  field,
  provided,
  snapshot,
  onChangeVisibility,
  compact: small
}: TyrTableColumnConfigItemProps) => {
  const { locked, name, label, hidden } = field;
  const isDragging = snapshot ? snapshot.isDragging : false;
  const innerRef = provided ? provided.innerRef : undefined;

  const getItemStyle = (draggableStyle: any) => ({
    ...itemStyle,
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

export default TyrTableColumnConfigItem;
