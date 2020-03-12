import * as React from 'react';

import { DragSource, DropTarget, DropTargetMonitor } from 'react-dnd';

import { FormInstance } from 'antd/lib/form';

import Form from 'antd/lib/form/Form';

// EditableRow, DraggableRow, EditableDraggableRow

export interface EditableContextProps {
  form?: FormInstance;
}

export const EditableContext = React.createContext<EditableContextProps>({});

interface BodyRowProps {
  connectDragSource: (component: React.ReactNode) => React.ReactElement<any>;
  connectDropTarget: (component: React.ReactNode) => React.ReactElement<any>;
  moveRow: (dragIndex: number, hoverIndex: number) => void;
  isOver: boolean;
  isDragging: boolean;
  className: string;
  style: any;
  index: number;
  dndEnabled: boolean;
  form: FormInstance;
}

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
      isDragging,
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

    if (isDragging) {
      className += ' tyr-is-dragging';
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
    (connect, monitor) => ({
      connectDragSource: connect.dragSource(),
      isDragging: monitor.isDragging()
    })
  )(BodyRow)
);

export const EditableFormRow = Form.create()(BodyRow);
export const EditableDraggableBodyRow = Form.create()(DraggableBodyRow);
