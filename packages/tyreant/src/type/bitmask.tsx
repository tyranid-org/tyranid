import * as React from 'react';
import { useState } from 'react';

import { byName, TyrTypeProps, getTypeValue } from './type';
import { withTypeContext } from './type';
import { decorateField } from '../core';
import Checkbox from 'antd/es/checkbox';

export const TyrBitmaskBase = ((props: TyrTypeProps) => {
  return decorateField('bitmask', props, () => {
    const { path, document } = props;
    const { tail: field } = path;
    const { link } = field;
    const { values } = link!;
    const [mask, setMask] = useState(getTypeValue(props, 0x0) as number);

    const check = (id: number, checked: boolean) => {
      const bit = 1 << (id - 1);
      const newMask = checked ? mask | bit : mask & ~bit;
      path.set(document!, newMask, { create: true });
      setMask(newMask);
    };

    return (
      <>
        {values.map(value => {
          const checked = (mask & (1 << ((value.$id as number) - 1))) !== 0x0;
          return (
            <Checkbox
              key={value.$id}
              checked={checked}
              onChange={e => check(value.$id as number, e.target.checked)}
            >
              {value.$label}
            </Checkbox>
          );
        })}
      </>
    );
  });
}) as React.ComponentType<TyrTypeProps>;

export const TyrBitmask = withTypeContext(TyrBitmaskBase);

byName.bitmask = {
  component: TyrBitmaskBase
};
