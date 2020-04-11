import * as React from 'react';
import { useState } from 'react';

import { Tyr } from 'tyranid/client';

import { TyrTypeProps, getTypeValue, className, onTypeChange } from './type';
import { TyrThemedFieldBase, decorateField } from '../core';
import { CloseOutlined } from '@ant-design/icons';
import { Button } from 'antd';

/**
 * This control renders an array as a list of its contents.
 */
export const TyrArrayList = <D extends Tyr.Document = Tyr.Document>(
  props: TyrTypeProps<D>
) => {
  const path = props.path!;

  const { tail: field, detail: elField } = path;

  const [array, setArray] = useState(getTypeValue(props, []) as any[]);

  // using a counter here because we want to keep using the same array
  const [counter, setCounter] = useState(0);

  const addElement = () => {
    array.push(elField.type.create(elField));
    setArray(array);
    setCounter(counter + 1);
    onTypeChange(props, array, array);
  };

  const removeElement = (idx: number) => {
    array.splice(idx, 1);
    setArray(array);
    setCounter(counter + 1);
    onTypeChange(props, array, array);
  };

  return decorateField('string', props, () => (
    <div className={className('tyr-array-list', props)}>
      {!array.length && (
        <div>
          <i>None</i>
        </div>
      )}
      {array.map((value, idx) => {
        const childPath = path.tail.collection.parsePath(path.name + '.' + idx);
        return (
          <div className="tyr-array-list-element" key={idx}>
            <Button
              icon={<CloseOutlined />}
              size="small"
              onClick={ev => removeElement(idx)}
            />
            <TyrThemedFieldBase noLabel {...props} path={childPath} />
          </div>
        );
      })}
      <Button onClick={() => addElement()}>
        {'Add ' + Tyr.singularize(field.label as string)}
      </Button>
    </div>
  ));
};
