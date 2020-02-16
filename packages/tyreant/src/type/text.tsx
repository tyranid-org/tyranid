import * as React from 'react';
import { useEffect } from 'react';

import { Input } from 'antd';

import { byName, TyrTypeProps, mapPropsToForm, onTypeChange } from './type';
import { stringFilter, stringFinder } from './string';
import { withTypeContext } from './type';
import { decorateField } from '../core';
import { registerComponent } from '../common';

const { TextArea } = Input;

export const TyrTextBase = ((props: TyrTypeProps) => {
  useEffect(() => mapPropsToForm(props), [props.path?.name]);

  return decorateField('text', props, () => {
    const onTypeChangeFunc = (ev: any) => {
      onTypeChange(props, ev.target.value, ev);
      props.onChange && props.onChange(ev.target.value, ev, props);
    };

    return (
      <TextArea
        placeholder={props.placeholder}
        autoFocus={props.autoFocus}
        onChange={onTypeChangeFunc}
        tabIndex={props.tabIndex}
        rows={6}
      />
    );
  });
}) as React.ComponentType<TyrTypeProps>;

export const TyrText = withTypeContext(TyrTextBase);

byName.text = {
  component: TyrTextBase,
  filter: stringFilter,
  finder: stringFinder
};

registerComponent('TyrText', TyrText);
