import * as React from 'react';
import { useEffect } from 'react';

import { Input } from 'antd';

import { byName, TyrTypeProps, className, mapPropsToForm } from './type';
import { stringFilter, stringFinder } from './string';
import { withTypeContext } from './type';
import { decorateField } from '../core';

export const TyrEmailBase = ((props: TyrTypeProps) => {
  useEffect(() => {
    mapPropsToForm(props);
  }, []);

  return decorateField(
    props,
    <Input
      className={className('tyr-email', props)}
      autoComplete="off"
      type="email"
      placeholder={props.placeholder}
      autoFocus={props.autoFocus}
    />
  );
}) as React.ComponentType<TyrTypeProps>;

export const TyrEmail = withTypeContext(TyrEmailBase);

byName.email = {
  component: TyrEmailBase,
  filter: stringFilter,
  finder: stringFinder
};
