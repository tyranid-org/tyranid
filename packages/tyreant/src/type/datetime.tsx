import * as React from 'react';
import { useEffect } from 'react';
import * as moment from 'moment';

import { Tyr } from 'tyranid/client';

import { DatePicker } from 'antd';

import { byName, generateRules, TyrTypeProps, className } from './type';
import { mapDocumentToForm, withTypeContext } from './type';

export const TyrDateTimeBase = ((props: TyrTypeProps) => {
  const { document, field, form } = props;

  useEffect(() => {
    mapDocumentToForm(field, document, form);
  });

  return form.getFieldDecorator(field.path, {
    rules: generateRules(field)
  })(
    <DatePicker
      className={className('tyr-datetime', props)}
      allowClear={false}
    />
  );
}) as React.ComponentType<TyrTypeProps>;

export const TyrDateTime = withTypeContext(TyrDateTimeBase);

byName.datetime = {
  component: TyrDateTimeBase,
  mapDocumentValueToFormValue(field: Tyr.FieldInstance, value: Tyr.anny) {
    return moment(value);
  }
};
