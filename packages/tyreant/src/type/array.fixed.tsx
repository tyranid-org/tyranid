import * as React from 'react';

import { Tyr } from 'tyranid/client';

import { TyrTypeProps, getTypeValue } from './type';
import { TyrThemedFieldBase } from '../core';
import { TypeContext } from '../core/theme';

/**
 * This control renders an array as a fixed list indexed by a predefined list.
 */
export const TyrArrayFixed = <D extends Tyr.Document = Tyr.Document>(
  props: TyrTypeProps<D>
) => {
  const { path, children } = props;

  const array = getTypeValue(props, []) as any[];

  const { fixedField: fixedFieldName } = props;
  if (!fixedFieldName)
    throw new Error(
      '"fixedField" must be specified for TyrArrayFixed controls'
    );

  const fixedPath = path!.walk(fixedFieldName);
  const fixedField = fixedPath.tail;
  const fixedLink = fixedField.link;
  if (!fixedLink)
    throw new Error(
      '"fixedField" path "${fixedPath.name}" not valid -- must refer to a link field'
    );
  if (!fixedLink.isStatic())
    throw new Error(
      '"fixedField" path "${fixedPath.name}" not valid -- must link to a static collection'
    );
  const fixedValues = fixedLink.values;

  for (const fixedValue of fixedValues) {
    const id = fixedValue.$id;
    const match = array.find(v => v[fixedFieldName] === id);
    if (!match) {
      array.push({
        [fixedFieldName]: id,
      });
    }
  }

  return (
    <>
      {array.map((value, idx) => {
        const childPath = path!.walk('' + idx);
        return children ? (
          <TypeContext.Provider
            key={idx}
            value={Object.assign({}, props, { path: childPath })}
          >
            {children}
          </TypeContext.Provider>
        ) : (
          <TyrThemedFieldBase key={idx} {...props} path={childPath} />
        );
      })}
    </>
  );
};
