import * as React from 'react';
import { useEffect } from 'react';

import { Input } from 'antd';

import { Tyr } from 'tyranid/client';

import { byName, TyrTypeProps, mapPropsToForm, onTypeChange } from './type';
import { decorateField } from '../core';
import { registerComponent } from '../common';
import { withThemedTypeContext } from '../core/theme';

export const TyrEmailBase = <D extends Tyr.Document = Tyr.Document>(
  props: TyrTypeProps<D>
) => {
  useEffect(() => mapPropsToForm(props), [props.path?.name]);

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
};

export const TyrEmail = withThemedTypeContext('email', TyrEmailBase);

byName.email = {
  extends: 'string',
  component: TyrEmailBase,
};

registerComponent('TyrEmail', TyrEmail);
