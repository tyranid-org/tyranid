import * as React from 'react';
import { useEffect } from 'react';
import * as moment from 'moment';

import { Tyr } from 'tyranid/client';

import { TimePicker } from 'antd';

import { byName, TyrTypeProps, mapPropsToForm, onTypeChange } from './type';
import { withThemedTypeContext } from '../core/theme';
import { decorateField } from '../core';
import { registerComponent } from '../common';

export const TyrTimeBase = ((props: TyrTypeProps) => {
  useEffect(() => mapPropsToForm(props), [props.path && props.path.name]);

  return decorateField('time', props, () => {
    const onTypeChangeFunc = (ev: any) => {
      onTypeChange(props, ev, ev);
      props.onChange && props.onChange(ev, ev, props);
    };

    return (
      <TimePicker
        placeholder={props.placeholder}
        onChange={onTypeChangeFunc}
        {...{ tabIndex: props.tabIndex }}
      />
    );
  });
}) as React.ComponentType<TyrTypeProps>;

export const TyrTime = withThemedTypeContext('time', TyrTimeBase);

byName.time = {
  component: TyrTimeBase,
  mapDocumentValueToFormValue(path: Tyr.PathInstance, value: Tyr.anny) {
    return moment(value);
  }
};

registerComponent('TyrTime', TyrTime);
