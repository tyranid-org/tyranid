import * as React from 'react';
import * as moment from 'moment';

import { Tyr } from 'tyranid/client';

import { TimePicker } from 'antd';

import { byName, generateRules, TyrTypeProps, className } from './type';
import { withTypeContext } from './type';

export const TyrTimeBase = ((props: TyrTypeProps) => {
  const { field, form } = props;

  return form.getFieldDecorator(field.path, {
    rules: generateRules(field),
  })(<TimePicker className={className('tyr-time', props)} />);
}) as React.ComponentType<TyrTypeProps>;

export const TyrTime = withTypeContext(TyrTimeBase);

byName.time = {
  component: TyrTimeBase,
  mapDocumentValueToFormValue(field: Tyr.FieldInstance, value: Tyr.anny) {
    return moment(value);
  },
};
