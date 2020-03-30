import * as React from 'react';
import { useEffect } from 'react';

import { Input } from 'antd';

import { byName, TyrTypeProps, mapPropsToForm, onTypeChange } from './type';
import { stringFilter, stringFinder } from './string';
import { withThemedTypeContext } from '../core/theme';
import { decorateField } from '../core';
import { registerComponent } from '../common';

const { TextArea } = Input;

export const TyrTextBase = ((props: TyrTypeProps) => {
  useEffect(() => mapPropsToForm(props), [props.path?.name]);

  return decorateField('text', props, () => (
    <TextArea
      placeholder={props.placeholder}
      autoFocus={props.autoFocus}
      onChange={ev => onTypeChange(props, ev.target.value, ev)}
      tabIndex={props.tabIndex}
      rows={props.textAreaRows || 6}
    />
  ));
}) as React.ComponentType<TyrTypeProps>;

export const TyrText = withThemedTypeContext('text', TyrTextBase);

byName.text = {
  component: TyrTextBase,
  filter: stringFilter,
  finder: stringFinder
};

registerComponent('TyrText', TyrText);
