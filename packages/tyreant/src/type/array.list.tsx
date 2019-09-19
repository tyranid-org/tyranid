import * as React from 'react';

import { Tyr } from 'tyranid/client';

import { TyrTypeProps, getTypeValue, className, onTypeChange } from './type';
import { TyrFieldBase } from '../core';
import { Button } from 'antd';

/**
 * This control renders an array as a list of its contents.
 */
export const TyrArrayList = (props: TyrTypeProps) => {
  const { document, path, form } = props;

  //useEffect(() => {
  //mapDocumentToForm(field, document, form);
  //}, []);

  const { tail: field, detail: elField } = path;

  const [array, setArray] = React.useState(getTypeValue(props, []) as any[]);

  // using a counter here because we want to keep using the same array
  const [counter, setCounter] = React.useState(0);

  const addElement = () => {
    array.push(elField.type.create(elField));
    setArray(array);
    setCounter(counter + 1);
    onTypeChange(props, array);
  };

  const removeElement = (idx: number) => {
    array.splice(idx, 1);
    setArray(array);
    setCounter(counter + 1);
    onTypeChange(props, array);
  };

  return (
    <div className={className('tyr-array-list', props)}>
      <label>{field.label}:</label>
      <br />
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
              icon="close"
              size="small"
              onClick={ev => removeElement(idx)}
            />
            <TyrFieldBase noLabel {...props} path={childPath} />
          </div>
        );
      })}
      <Button onClick={() => addElement()}>
        {'Add ' + Tyr.singularize(field.label as string)}
      </Button>
    </div>
  );
};
