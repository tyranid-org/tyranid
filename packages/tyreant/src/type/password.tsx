import * as React from 'react';
import { useEffect } from 'react';

import { Input } from 'antd';

import { Tyr } from 'tyranid/client';

import { byName, mapPropsToForm, TyrTypeProps, onTypeChange } from './type';
import { withThemedTypeContext } from '../core/theme';
import { decorateField } from '../core';
import { registerComponent } from '../common';

export const TyrPasswordBase = <D extends Tyr.Document = Tyr.Document>(
  props: TyrTypeProps<D>
) => {
  useEffect(() => mapPropsToForm(props), [props.path?.name]);

  return decorateField('password', props, () => (
    <Input.Password
      autoFocus={props.autoFocus}
      placeholder={props.placeholder}
      onChange={ev => onTypeChange(props, ev.target.value, ev)}
      tabIndex={props.tabIndex}
      className={props.className}
      onPressEnter={props.onPressEnter}
    />
  ));
};

export const TyrPassword = withThemedTypeContext('password', TyrPasswordBase);

byName.password = {
  component: TyrPasswordBase,
};

registerComponent('TyrPassword', TyrPassword);
