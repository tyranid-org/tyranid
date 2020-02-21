import * as React from 'react';
import { useEffect } from 'react';

import * as moment from 'moment-timezone';

import { Select } from 'antd';

import {
  byName,
  mapPropsToForm,
  TyrTypeProps,
  withTypeContext,
  onTypeChange
} from './type';
import { decorateField } from '../core';
import { registerComponent } from '../common';

const getOffset = (tzName: string) => {
  if (tzName === 'useOrgDefault' || tzName === 'useClient') return 0;

  const thisMoment = moment().unix();
  const zone = moment.tz.zone(tzName);
  return zone ? zone.utcOffset(thisMoment) / 60 : 0;
};

const createOption = (tzName: string) => {
  const offset = getOffset(tzName);

  let sign = '+';
  if (offset < 0) {
    sign = '';
  }

  const zoneTime = moment()
    .tz(tzName)
    .format('hh:mm A');

  return (
    <Select.Option key={tzName}>
      {tzName + ' - (GMT ' + sign + offset + ') - (' + zoneTime + ')'}
    </Select.Option>
  );
};

export const TyrTimeZoneBase = ((props: TyrTypeProps) => {
  useEffect(() => mapPropsToForm(props), [props.path && props.path.name]);

  return decorateField('timezone', props, () => (
    <Select
      autoFocus={props.autoFocus}
      placeholder={props.placeholder}
      onChange={ev => onTypeChange(props, ev, ev)}
      tabIndex={props.tabIndex}
    >
      {moment.tz.names().map(createOption)}
    </Select>
  ));
}) as React.ComponentType<TyrTypeProps>;

export const TyrTimeZone = withTypeContext('timezone', TyrTimeZoneBase);

byName.timezone = {
  component: TyrTimeZoneBase
};

registerComponent('TyrTimeZone', TyrTimeZone);
