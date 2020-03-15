import * as React from 'react';

import { useDrag, useDrop } from 'react-dnd';

import { FormInstance } from 'antd/lib/form';

import Form, { useForm } from 'antd/lib/form/Form';

export interface EditableContextProps {
  form?: FormInstance;
}

export const EditableContext = React.createContext<EditableContextProps>({});

export interface BodyRowProps {
  moveRow: (dragIndex: number, hoverIndex: number) => void;
  isOver: boolean;
  isDragging: boolean;
  className: string;
  dropClassName: string;
  style: any;
  index: number;
  dndEnabled: boolean;
}

const acceptType = 'DraggableBodyRow';

export const EditableFormRow = (props: BodyRowProps) => {
  const [form] = useForm();
  const ref = React.useRef<HTMLTableRowElement>(null);

  const { moveRow, dndEnabled, index, ...restProps } = props;

  const style = {
    ...restProps.style,
    cursor: dndEnabled ? 'move' : form ? 'pointer' : 'default'
  };

  let rowClassName = restProps.className;

  if (dndEnabled) {
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
            dragIndex < index ? 'drop-over-downward' : 'drop-over-upward'
        };
      },
      drop: item => {
        moveRow(((item as unknown) as { index: number }).index, index);
      }
    });

    const [{ isDragging }, drag] = useDrag({
      item: { type: acceptType, index },
      collect: monitor => ({
        isDragging: monitor.isDragging()
      })
    });

    drop(drag(ref));

    if (isOver) {
      rowClassName += ' ' + dropClassName;
    }

    if (isDragging) {
      rowClassName += ' tyr-is-dragging';
    }
  }

  if (dndEnabled) {
    return (
      <tr
        ref={ref}
        key={`form-${index}`}
        {...restProps}
        className={rowClassName}
        style={style}
      />
    );
  }

  return (
    <Form form={form} component={false}>
      <EditableContext.Provider value={{ form }}>
        <tr
          ref={ref}
          key={`form-${index}`}
          {...restProps}
          className={rowClassName}
          style={style}
        />
      </EditableContext.Provider>
    </Form>
  );
};
