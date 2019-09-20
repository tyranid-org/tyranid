import * as React from 'react';
import { useEffect } from 'react';

import { Input } from 'antd';

import { byName, TyrTypeProps, mapPropsToForm, onTypeChange } from './type';
import { withTypeContext } from './type';
import { decorateField } from '../core';

export const TyrBitmaskBase = ((props: TyrTypeProps) => {
  useEffect(() => {
    mapPropsToForm(props);
  }, []);

  /*<Input
        autoComplete="off"
        type="email"
        placeholder={props.placeholder}
        autoFocus={props.autoFocus}
        onChange={ev => onTypeChange(props, ev.target.value)}
      />*/

  return decorateField('bitmask', props, () => (
    <div>TODO: bitmask control</div>
  ));
}) as React.ComponentType<TyrTypeProps>;

export const TyrBitmask = withTypeContext(TyrBitmaskBase);

byName.bitmask = {
  component: TyrBitmaskBase
};
