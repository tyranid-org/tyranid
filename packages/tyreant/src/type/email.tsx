import * as React from 'react';
import { useEffect } from 'react';

import { Input } from 'antd';

import { byName, TyrTypeProps, mapPropsToForm, onTypeChange } from './type';
import { stringFilter, stringFinder } from './string';
import { withTypeContext } from './type';
import { decorateField } from '../core';
import { registerComponent } from '../common';

export const TyrEmailBase = ((props: TyrTypeProps) => {
  useEffect(() => mapPropsToForm(props), [props.path!.name]);

  return decorateField('email', props, () => {
    const onTypeChangeFunc = (ev: any) => {
      onTypeChange(props, ev.target.value, ev);
      props.onChange && props.onChange(ev.target.value, ev, props);
    };

    return (
      <Input
        autoComplete="off"
        type="email"
        placeholder={props.placeholder}
        autoFocus={props.autoFocus}
        onChange={onTypeChangeFunc}
        tabIndex={props.tabIndex}
      />
    );
  });
}) as React.ComponentType<TyrTypeProps>;

export const TyrEmail = withTypeContext(TyrEmailBase);

byName.email = {
  component: TyrEmailBase,
  filter: stringFilter,
  finder: stringFinder
};

registerComponent('TyrEmail', TyrEmail);
