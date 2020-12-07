import * as React from 'react';
import { useEffect } from 'react';
import * as moment from 'moment';

import { Tyr } from 'tyranid/client';

import { TimePicker } from 'antd';

import { byName, TyrTypeProps, mapPropsToForm, onTypeChange } from './type';
import { withThemedTypeContext } from '../core/theme';
import { decorateField, getValue } from '../core';
import { registerComponent } from '../common';

const TIME_FORMAT = 'HH:mm:ss';

export const TyrTimeBase = <D extends Tyr.Document = Tyr.Document>(
  props: TyrTypeProps<D>
) => {
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
};

export const TyrTime = withThemedTypeContext('time', TyrTimeBase);

byName.time = {
  component: TyrTimeBase,
  mapDocumentValueToFormValue(path: Tyr.PathInstance, value: Tyr.anny) {
    return value && moment(value);
  },
  cellValue(path, document, props) {
    const v = getValue(props, document);
    return !v
      ? ''
      : moment(v)
          .format(
            (props.dateFormat as string) || Tyr.local.timeFormat || TIME_FORMAT
          )
          .toUpperCase();
  },
};

registerComponent('TyrTime', TyrTime);
