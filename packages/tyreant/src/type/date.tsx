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

type RangePickerValue = [moment.Moment, moment.Moment];

const DATE_FORMAT = 'MM/DD/YYYY';

export const TyrDateBase = <D extends Tyr.Document = Tyr.Document>(
  props: TyrTypeProps<D>
) => {
  useEffect(() => mapPropsToForm(props), [props.path && props.path.name]);

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
    return value ? moment(value) : null;
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
          {(searchValue, setSearchValue, search) => (
            <RangePicker
              value={searchValue}
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
        if (value === undefined) return true;
        value = parseSearchValue(value);

        if (props.onFilter) {
          return props.onFilter(value, doc);
        }

        const val = path.get(doc);

        if (val) {
          const dateVal = moment(val);
          return (
            dateVal.isSameOrAfter(value[0]) && dateVal.isSameOrBefore(value[1])
          );
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
      opts.query[path.name] = {
        $gte: sv[0],
        $lte: sv[1],
      };
    }
  },
  cellValue(path, document, props) {
    const v = getValue(props, document);
    return !v
      ? ''
      : moment(v).format(
          (
            (props.dateFormat as string) ||
            Tyr.local.dateFormat ||
            DATE_FORMAT
          ).toUpperCase()
        );
  },
};

registerComponent('TyrDate', TyrDate);
