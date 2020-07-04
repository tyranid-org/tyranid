import * as React from 'react';
import { useEffect } from 'react';
import * as moment from 'moment';

import { Tyr } from 'tyranid/client';

import { DatePicker } from 'antd';

import { byName, TyrTypeProps, mapPropsToForm, onTypeChange } from './type';
import { TyrFilter } from '../core/filter';
import { decorateField, getValue } from '../core';
import { registerComponent } from '../common';
import { withThemedTypeContext } from '../core/theme';

const { RangePicker } = DatePicker;

type RangePickerValue = [moment.Moment, moment.Moment];

const DATE_FORMAT = 'MM/DD/YYYY';

export const TyrDateRangeBase = <D extends Tyr.Document = Tyr.Document>(
  props: TyrTypeProps<D>
) => {
  useEffect(() => mapPropsToForm(props), [props.path && props.path.name]);

  return decorateField('daterange', props, () => {
    const onTypeChangeFunc = (ev: any) => {
      onTypeChange(props, ev, ev);
      props.onChange && props.onChange(ev, ev, props);
    };

    return (
      <RangePicker
        allowClear={true}
        autoFocus={props.autoFocus}
        format={(
          (props.dateFormat as string) ||
          Tyr.local.dateFormat ||
          DATE_FORMAT
        ).toUpperCase()}
        onChange={onTypeChangeFunc}
        tabIndex={props.tabIndex}
      />
    );
  });
};

export const TyrDateRange = withThemedTypeContext(
  'daterange',
  TyrDateRangeBase
);

function parseSearchValue(value: any) {
  if (typeof value === 'string') value = value.split(',');
  return value
    ? ((value as string[]).map(v => moment(v)) as RangePickerValue)
    : undefined;
}

byName.daterange = {
  component: TyrDateRangeBase,
  mapDocumentValueToFormValue: (
    path: Tyr.PathInstance,
    value: { start?: string; end?: string }
  ) =>
    value && value.start && value.end
      ? [moment(value.start), moment(value.end)]
      : undefined,
  mapFormValueToDocumentValue: (path, value: RangePickerValue, props) =>
    value.length
      ? {
          start: value[0],
          end: value[1],
        }
      : undefined,
  filter(component, props) {
    const path = props.path!;

    return {
      filterDropdown: filterDdProps => (
        <TyrFilter<RangePickerValue>
          typeName="date"
          component={component}
          filterDdProps={filterDdProps}
          pathProps={props}
        >
          {(searchValue, setSearchValue, search) => (
            <RangePicker
              autoFocus={true}
              value={searchValue}
              format={props.dateFormat || DATE_FORMAT}
              onChange={v => {
                setSearchValue(v as RangePickerValue);
              }}
              //style={{ width: 188, marginBottom: 8, display: 'block' }}
            />
          )}
        </TyrFilter>
      ),
      onFilter: (values: moment.Moment[], doc: Tyr.Document) => {
        const range = path.get(doc);

        if (!range) return false;

        const filterStart = values[0].startOf('day');

        if (range.start) {
          const start = moment(range.start);

          if (start.isBefore(filterStart)) return false;
        }

        const filterEnd = values[1].startOf('day');

        if (range.end) {
          const end = moment(range.end);

          if (end.isAfter(filterEnd)) return false;
        }

        return true;
      },
      onFilterDropdownVisibleChange: (visible: boolean) => {
        if (visible) {
          // setTimeout(() => searchInputRef!.focus());
        }
      },
    };
  },
  finder(path, opts, searchValue) {
    const sv = parseSearchValue(searchValue);
    if (sv) {
      if (!opts.query) opts.query = {};
      opts.query[path.name] = {
        $gte: sv[0],
        $lte: sv[1],
      };
    }
  },
  cellValue(path, document, props) {
    const v = getValue(props, document);
    const fmt =
      (props.dateFormat as string) || Tyr.local.dateFormat || DATE_FORMAT;

    return (
      <span>
        {(v.start ? moment(v.start).format(fmt).toUpperCase() : '---') +
          ' - ' +
          (v.end ? moment(v.end).format(fmt).toUpperCase() : '---')}
      </span>
    );
  },
};

registerComponent('TyrDateRange', TyrDateRange);
