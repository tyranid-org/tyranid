import * as React from 'react';
import { useEffect } from 'react';
import * as moment from 'moment';

import { Tyr } from 'tyranid/client';

import { DatePicker } from 'antd';

import {
  byName,
  generateRules,
  TyrTypeProps,
  className,
  mapPropsToForm
} from './type';
import { withTypeContext } from './type';

export const TyrDateBase = ((props: TyrTypeProps) => {
  const { path, form } = props;

  useEffect(() => {
    mapPropsToForm(props);
  });

  return form.getFieldDecorator(path.name, {
    rules: generateRules(props)
  })(
    <DatePicker className={className('tyr-date', props)} allowClear={false} />
  );
}) as React.ComponentType<TyrTypeProps>;

export const TyrDate = withTypeContext(TyrDateBase);

byName.date = {
  component: TyrDateBase,
  mapDocumentValueToFormValue(path: Tyr.NamePathInstance, value: Tyr.anny) {
    return moment(value);
  }
};
