import * as React from 'react';
import { useEffect } from 'react';
import * as moment from 'moment';

import { Tyr } from 'tyranid/client';

import { DatePicker } from 'antd';

const { RangePicker } = DatePicker;

import { byName, TyrTypeProps, mapPropsToForm, onTypeChange } from './type';
import { TyrFilter } from '../core/filter';
import { decorateField, getValue } from '../core';
import { registerComponent } from '../common';
import { withThemedTypeContext } from '../core/theme';

type RangePickerValue =
  | [moment.Moment | null, moment.Moment | null]
  | null
  | undefined;

const DATE_FORMAT = 'MM/DD/YYYY';

export const TyrDateBase = <D extends Tyr.Document = Tyr.Document>(
  props: TyrTypeProps<D>
) => {
  useEffect(() => mapPropsToForm(props), [
    props.path && props.path.name,
    props.document,
  ]);

  return decorateField('date', props, () => {
    const onTypeChangeFunc = (ev: any) => {
      onTypeChange(props, ev, ev);
      props.onChange && props.onChange(ev, ev, props);
    };

    return (
      <DatePicker
        allowClear={false}
        autoFocus={props.autoFocus}
        placeholder={props.placeholder}
        onChange={onTypeChangeFunc}
        format={(
          (props.dateFormat as string) ||
          Tyr.local.dateFormat ||
          DATE_FORMAT
        ).toUpperCase()}
        tabIndex={props.tabIndex}
      />
    );
  });
};

export const TyrDate = withThemedTypeContext('date', TyrDateBase);

function parseSearchValue(value: any) {
  if (typeof value === 'string') value = value.split(',');
  return value
    ? ((value as string[]).map(v => moment(v)) as RangePickerValue)
    : undefined;
}

byName.date = {
  component: TyrDateBase,
  mapDocumentValueToFormValue(path: Tyr.PathInstance, value: Tyr.anny) {
    return value ? moment(value) : null; // must be null--- undefined will not clear the field
  },
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
          {(searchValue, setSearchValue) => (
            <RangePicker
              value={searchValue as any} // How to type this?
              autoFocus={true}
              format={props.dateFormat || DATE_FORMAT}
              onChange={v => {
                setSearchValue(v as RangePickerValue);
              }}
              //style={{ width: 188, marginBottom: 8, display: 'block' }}
            />
          )}
        </TyrFilter>
      ),
      onFilter: (value: any, doc: Tyr.Document) => {
        if (value === undefined || value === null) return true;
        value = parseSearchValue(value);

        if (props.onFilter) {
          return props.onFilter(value, doc);
        }

        const val = path.get(doc);

        if (val) {
          const date = moment(val);
          const range = (value as RangePickerValue)!;

          const filterStart = range[0]!.startOf('day');

          if (filterStart) {
            if (date.isBefore(filterStart)) return false;
          }

          const filterEnd = range[1]!.endOf('day');

          if (filterEnd) {
            if (date.isAfter(filterEnd)) return false;
          }

          return true;
        }

        return false;
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
      opts.query[path.spathArr] = {
        $gte: sv[0],
        $lte: sv[1],
      };
    }
  },
  cellValue(path, document, props) {
    const v = getValue(props, document);

    return !v
      ? ''
      : moment(v)
          .format(
            (props.dateFormat as string) ||
              Tyr.local.dateFormat ||
              (Tyr.options.formats && Tyr.options.formats.date) ||
              DATE_FORMAT
          )
          .toUpperCase();
  },
};

registerComponent('TyrDate', TyrDate);
