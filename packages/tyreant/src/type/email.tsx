import * as React from 'react';
import { useEffect } from 'react';

import { Input } from 'antd';

import { byName, TyrTypeProps, mapPropsToForm, onTypeChange } from './type';
import { stringFilter, stringFinder } from './string';
import { withTypeContext } from './type';
import { decorateField } from '../core';

export const TyrEmailBase = ((props: TyrTypeProps) => {
  useEffect(() => {
    mapPropsToForm(props);
  }, []);

  return decorateField('email', props, () => (
    <Input
      autoComplete="off"
      type="email"
      placeholder={props.placeholder}
      autoFocus={props.autoFocus}
      onChange={ev => onTypeChange(props, ev.target.value)}
      tabIndex={props.tabIndex}
    />
  ));
}) as React.ComponentType<TyrTypeProps>;

export const TyrEmail = withTypeContext(TyrEmailBase);

byName.email = {
  component: TyrEmailBase,
  filter: stringFilter,
  finder: stringFinder
};
