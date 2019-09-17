import * as React from 'react';
import { useEffect } from 'react';
import * as moment from 'moment';

import { Tyr } from 'tyranid/client';

import { DatePicker } from 'antd';

import { byName, TyrTypeProps, className, mapPropsToForm } from './type';
import { withTypeContext } from './type';
import { decorateField } from '../core';

export const TyrDateTimeBase = ((props: TyrTypeProps) => {
  useEffect(() => {
    mapPropsToForm(props);
  }, []);

  return decorateField(
    props,
    props.renderField && props.document ? props.renderField(props.document) :
    <DatePicker
      className={className('tyr-datetime', props)}
      allowClear={false}
      placeholder={props.placeholder}
      autoFocus={props.autoFocus}
    />
  );
}) as React.ComponentType<TyrTypeProps>;

export const TyrDateTime = withTypeContext(TyrDateTimeBase);

byName.datetime = {
  component: TyrDateTimeBase,
  mapDocumentValueToFormValue(path: Tyr.NamePathInstance, value: Tyr.anny) {
    return moment(value);
  }
};
