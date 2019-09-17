import * as React from 'react';
import { useEffect } from 'react';
import * as moment from 'moment';

import { Tyr } from 'tyranid/client';

import { TimePicker } from 'antd';

import {
  byName,
  generateRules,
  TyrTypeProps,
  className,
  mapPropsToForm
} from './type';
import { withTypeContext } from './type';

export const TyrTimeBase = ((props: TyrTypeProps) => {
  const { path, form } = props;

  useEffect(() => {
    mapPropsToForm(props);
  }, []);

  return form.getFieldDecorator(path.identifier, {
    rules: generateRules(props)
  })(
    <TimePicker
      className={className('tyr-time', props)}
      placeholder={props.placeholder}
    />
  );
}) as React.ComponentType<TyrTypeProps>;

export const TyrTime = withTypeContext(TyrTimeBase);

byName.time = {
  component: TyrTimeBase,
  mapDocumentValueToFormValue(path: Tyr.NamePathInstance, value: Tyr.anny) {
    return moment(value);
  }
};
