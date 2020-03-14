import * as React from 'react';

import {
  DragSource,
  DropTarget,
  DropTargetMonitor,
  useDrag,
  useDrop
} from 'react-dnd';

import { FormInstance } from 'antd/lib/form';

import Form, { useForm } from 'antd/lib/form/Form';

export interface EditableContextProps {
  form?: FormInstance;
}

export const EditableContext = React.createContext<EditableContextProps>({});

export interface BodyRowProps {
  connectDragSource: (component: React.ReactNode) => React.ReactElement<any>;
  connectDropTarget: (component: React.ReactNode) => React.ReactElement<any>;
  moveRow: (dragIndex: number, hoverIndex: number) => void;
  isOver: boolean;
  isDragging: boolean;
  className: string;
  style: any;
  index: number;
  dndEnabled: boolean;
}

let draggingIndex = -1;

export const EditableFormRow = (props: BodyRowProps) => {
  const [form] = useForm();

  const {
    isOver,
    connectDragSource,
    connectDropTarget,
    moveRow,
    dndEnabled,
    isDragging,
    ...restProps
  } = props;

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
      <Form form={form} component={false}>
        <EditableContext.Provider value={{ form }}>
          <tr
            key={`form-${restProps.index}`}
            {...restProps}
            className={className}
            style={style}
          />
        </EditableContext.Provider>
      </Form>
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
    <Form form={form}>
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
    </Form>
  );
};

const acceptType = 'DraggableBodyRow';

export const EditableDraggableBodyRow = ({
  index,
  moveRow,
  className,
  style,
  ...restProps
}: BodyRowProps) => {
  const ref = React.useRef<HTMLTableRowElement>(null);

  const [{ isOver, dropClassName }, drop] = useDrop({
    accept: acceptType,
    collect: monitor => {
      const { index: dragIndex } = monitor.getItem() || {};
      if (dragIndex === index) {
        return {};
      }
      return {
        isOver: monitor.isOver(),
        dropClassName:
          dragIndex < index ? ' drop-over-downward' : ' drop-over-upward'
      };
    },
    drop: item => {
      moveRow(((item as unknown) as { index: number }).index, index);
    }
  });
  const [, drag] = useDrag({
    item: { type: acceptType, index },
    collect: monitor => ({
      isDragging: monitor.isDragging()
    })
  });
  drop(drag(ref));
  return (
    <tr
      ref={ref}
      className={`${className}${isOver ? dropClassName : ''}`}
      style={{ cursor: 'move', ...style }}
      {...restProps}
    />
  );
};

/*
const DraggableBodyRowOld = DropTarget(
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
  )(EditableBodyRow)
);
*/

//export const EditableDraggableBodyRow = Form.create()(DraggableBodyRow);
