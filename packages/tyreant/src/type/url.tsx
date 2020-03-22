import * as React from 'react';
import { useEffect } from 'react';

import { Input } from 'antd';

import { byName, TyrTypeProps, mapPropsToForm, onTypeChange } from './type';
import { stringFilter, stringFinder } from './string';
import { decorateField } from '../core';
import { registerComponent } from '../common';
import { withThemedTypeContext } from '../core/theme';

export const TyrUrlBase = ((props: TyrTypeProps) => {
  useEffect(() => mapPropsToForm(props), [props.path?.name]);

  return decorateField('url', props, () => {
    const onTypeChangeFunc = (ev: any) => {
      onTypeChange(props, ev.target.value, ev);
      props.onChange && props.onChange(ev.target.value, ev, props);
    };

    return (
      <Input
        autoComplete="off"
        type="url"
        placeholder={props.placeholder}
        autoFocus={props.autoFocus}
        onChange={onTypeChangeFunc}
        tabIndex={props.tabIndex}
      />
    );
  });
}) as React.ComponentType<TyrTypeProps>;

export const TyrUrl = withThemedTypeContext('url', TyrUrlBase);

byName.url = {
  component: TyrUrlBase,
  filter: stringFilter,
  finder: stringFinder
};

registerComponent('TyrUrl', TyrUrl);
