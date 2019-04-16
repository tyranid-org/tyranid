import * as React from 'react';
import * as moment from 'moment';

import { Tyr } from 'tyranid/client';

import { DatePicker } from 'antd';

import { byName, generateRules, TyrTypeProps, className } from './type';
import { withTypeContext } from './type';

export const TyrDateBase = ((props: TyrTypeProps) => {
  const { field, form } = props;

  return form.getFieldDecorator(field.path, {
    rules: generateRules(field),
  })(
    <DatePicker className={className('tyr-date', props)} allowClear={false} />
  );
}) as React.ComponentType<TyrTypeProps>;

export const TyrDate = withTypeContext(TyrDateBase);

byName.date = {
  component: TyrDateBase,
  mapDocumentValueToFormValue(field: Tyr.FieldInstance, value: Tyr.anny) {
    return moment(value);
  },
};
