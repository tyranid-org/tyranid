import * as React from 'react';
import { useEffect } from 'react';
import * as moment from 'moment';

import { Tyr } from 'tyranid/client';

import { TimePicker } from 'antd';

import { byName, TyrTypeProps, mapPropsToForm, onTypeChange } from './type';
import { withTypeContext } from './type';
import { decorateField } from '../core';

export const TyrTimeBase = ((props: TyrTypeProps) => {
  useEffect(() => {
    mapPropsToForm(props);
  }, []);

  return decorateField('time', props, () => (
    <TimePicker
      placeholder={props.placeholder}
      onChange={ev => onTypeChange(props, ev, ev)}
      {...{ tabIndex: props.tabIndex }}
    />
  ));
}) as React.ComponentType<TyrTypeProps>;

export const TyrTime = withTypeContext(TyrTimeBase);

byName.time = {
  component: TyrTimeBase,
  mapDocumentValueToFormValue(path: Tyr.NamePathInstance, value: Tyr.anny) {
    return moment(value);
  }
};
