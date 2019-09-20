import * as React from 'react';

import { byName, TyrTypeProps, getTypeValue } from './type';
import { withTypeContext } from './type';
import { decorateField } from '../core';

export const TyrBitmaskBase = ((props: TyrTypeProps) => {
  /*<Input
        autoComplete="off"
        type="email"
        placeholder={props.placeholder}
        autoFocus={props.autoFocus}
        onChange={ev => onTypeChange(props, ev.target.value)}
      />*/

  return decorateField('bitmask', props, () => {
    const { path } = props;
    const { tail: field } = path;
    const { link } = field;
    const { values } = link!;
    const mask = getTypeValue(props, 0x0) as number;

    return (
      <div>
        {values.map(value => {
          return (
            <div>
              <input type="checkbox" /> <span>value.$label</span>
            </div>
          );
        })}
      </div>
    );
  });
}) as React.ComponentType<TyrTypeProps>;

export const TyrBitmask = withTypeContext(TyrBitmaskBase);

byName.bitmask = {
  component: TyrBitmaskBase
};
