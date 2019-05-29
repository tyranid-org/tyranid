import * as React from 'react';
import { useEffect } from 'react';
import * as moment from 'moment';

import { Tyr } from 'tyranid/client';

import { DatePicker } from 'antd';

import { byName, generateRules, TyrTypeProps, className } from './type';
import { mapDocumentToForm, withTypeContext } from './type';

export const TyrDateBase = ((props: TyrTypeProps) => {
  const { document, field, form } = props;

  useEffect(() => {
    mapDocumentToForm(field, document, form);
  });

  return form.getFieldDecorator(field.path, {
    rules: generateRules(field)
  })(
    <DatePicker className={className('tyr-date', props)} allowClear={false} />
  );
}) as React.ComponentType<TyrTypeProps>;

export const TyrDate = withTypeContext(TyrDateBase);

byName.date = {
  component: TyrDateBase,
  mapDocumentValueToFormValue(field: Tyr.FieldInstance, value: Tyr.anny) {
    return moment(value);
  }
};
