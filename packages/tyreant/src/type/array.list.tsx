import * as React from 'react';

import { TyrTypeProps, getTypeValue } from './type';
import { TyrField, TyrFieldBase } from '../core';

/**
 * This control renders an array as a list of its contents.
 */
export const TyrArrayList = (props: TyrTypeProps) => {
  const { document, path, form } = props;

  //useEffect(() => {
  //mapDocumentToForm(field, document, form);
  //}, []);

  console.log('path', path);
  const value = getTypeValue(props, []) as any[];
  console.log('value', value);

  return (
    <>
      {value.map((value, idx) => {
        const childPath = path.tail.collection.parsePath(path.name + '.' + idx);
        <TyrFieldBase {...props} path={childPath} />;
      })}
    </>
  );
};
