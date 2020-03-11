import * as React from 'react';
import { useEffect } from 'react';
import * as moment from 'moment';

import { Tyr } from 'tyranid/client';

import { DatePicker } from 'antd';
import { RangePickerValue } from 'antd/lib/date-picker/interface';

const { RangePicker } = DatePicker;

import { byName, TyrTypeProps, mapPropsToForm, onTypeChange } from './type';
import { TyrFilter, Filter, Filterable, Finder } from '../core/filter';
import { TyrPathProps, decorateField } from '../core';
import { registerComponent } from '../common';
import { withThemedTypeContext } from '../core/theme';

const DATE_FORMAT = 'MM/DD/YYYY';

export const TyrDateBase = ((props: TyrTypeProps) => {
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
        format={((props.dateFormat as string) || DATE_FORMAT).toUpperCase()}
        {...{ tabIndex: props.tabIndex }}
      />
    );
  });
}) as React.ComponentType<TyrTypeProps>;

export const TyrDate = withThemedTypeContext('date', TyrDateBase);

function parseSearchValue(value: any) {
  if (typeof value === 'string') value = value.split(',');
  return value
    ? ((value as string[]).map(v => moment(v)) as RangePickerValue)
    : undefined;
}

export const dateFilter: Filter = (
  filterable: Filterable,
  props: TyrPathProps
) => {
  const path = props.path!;

  return {
    filterDropdown: filterDdProps => (
      <TyrFilter<RangePickerValue>
        typeName="date"
        filterable={filterable}
        filterDdProps={filterDdProps}
        pathProps={props}
      >
        {(searchValue, setSearchValue, search) => (
          <RangePicker
            value={searchValue}
            format={props.dateFormat || DATE_FORMAT}
            onChange={v => {
              setSearchValue(v);
              if (props.liveSearch) search(true);
            }}
            //style={{ width: 188, marginBottom: 8, display: 'block' }}
          />
        )}
      </TyrFilter>
    ),
    onFilter: (value: any, doc: Tyr.Document) => {
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
    }
  };
};

export const dateFinder: Finder = (
  path: Tyr.NamePathInstance,
  opts: Tyr.anny /* Tyr.Options_Find */,
  searchValue: Tyr.anny
) => {
  const sv = parseSearchValue(searchValue);
  if (sv) {
    if (!opts.query) opts.query = {};
    opts.query[path.name] = {
      $gte: sv[0],
      $lte: sv[1]
    };
  }
};

byName.date = {
  component: TyrDateBase,
  mapDocumentValueToFormValue(path: Tyr.NamePathInstance, value: Tyr.anny) {
    return value ? moment(value) : null;
  },
  filter: dateFilter,
  finder: dateFinder,
  cellValue: (
    path: Tyr.NamePathInstance,
    document: Tyr.Document,
    props: TyrTypeProps
  ) => {
    const v = path.get(document);

    if (!v) {
      return '';
    }

    return moment(v).format(
      ((props.dateFormat as string) || DATE_FORMAT).toUpperCase()
    );
  }
};

registerComponent('TyrDate', TyrDate);
