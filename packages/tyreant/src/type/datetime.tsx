import * as React from 'react';
import { useEffect } from 'react';
import * as moment from 'moment';

import { Tyr } from 'tyranid/client';

import { DatePicker, Button } from 'antd';

import {
  byName,
  TyrTypeProps,
  mapPropsToForm,
  onTypeChange,
  Filter,
  Finder,
  Filterable
} from './type';
import { withTypeContext } from './type';
import { decorateField, TyrFieldLaxProps } from '../core';
import { registerComponent } from '../common';
import { FilterDropdownProps } from 'antd/lib/table';
const { RangePicker } = DatePicker;

const DATETIME_FORMAT = 'MM/DD/YYYY HH:mm:ss';

export const TyrDateTimeBase = ((props: TyrTypeProps) => {
  useEffect(() => mapPropsToForm(props), [props.path && props.path.name]);

  return decorateField('datetime', props, () => {
    const onTypeChangeFunc = (ev: any) => {
      onTypeChange(props, ev, ev);
      props.onChange && props.onChange(ev, ev, props);
    };

    return (
      <DatePicker
        allowClear={false}
        placeholder={props.placeholder}
        autoFocus={props.autoFocus}
        onChange={onTypeChangeFunc}
        {...{ tabIndex: props.tabIndex }}
      />
    );
  });
}) as React.ComponentType<TyrTypeProps>;

export const TyrDateTime = withTypeContext('datetime', TyrDateTimeBase);

function parseSearchValue(value: any) {
  if (typeof value === 'string') value = value.split(',');
  return value
    ? ((value as string[]).map(v => moment(v)) as [
        moment.Moment,
        moment.Moment
      ])
    : undefined;
}

export const dateTimeFilter: Filter = (
  path: Tyr.NamePathInstance,
  filterable: Filterable,
  props: TyrFieldLaxProps
) => {
  const pathName = path.name;

  const onClearFilters = (clearFilters?: (selectedKeys: string[]) => void) => {
    delete filterable.searchValues[pathName];
    clearFilters?.([]);
    filterable.onSearch();
  };

  return {
    filterDropdown: (filterDdProps: FilterDropdownProps) => {
      return (
        <div className="search-box">
          <RangePicker
            defaultValue={filterable.searchValues[pathName] || []}
            format={props.dateFormat || DATETIME_FORMAT}
            showTime={{
              defaultValue: [
                moment('00:00:00', 'HH:mm:ss'),
                moment('11:59:59', 'HH:mm:ss')
              ]
            }}
            onChange={v => {
              filterable.searchValues[pathName] = v;

              if (props.liveSearch) {
                filterable.onSearch();
                filterDdProps.confirm?.();
              }
            }}
            //style={{ width: 188, marginBottom: 8, display: 'block' }}
          />
          <div className="search-box-footer">
            <Button
              onClick={() => onClearFilters(filterDdProps.clearFilters)}
              size="small"
              style={{ width: 90 }}
            >
              Reset
            </Button>
            {!props.liveSearch && (
              <Button
                type="primary"
                onClick={() => {
                  filterable.onSearch();
                  filterDdProps.confirm?.();
                }}
                icon="search"
                size="small"
                style={{ width: 90 }}
              >
                Search
              </Button>
            )}
          </div>
        </div>
      );
    },
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

export const dateTimeFinder: Finder = (
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

byName.datetime = {
  component: TyrDateTimeBase,
  mapDocumentValueToFormValue(path: Tyr.NamePathInstance, value: Tyr.anny) {
    return moment(value);
  },
  filter: dateTimeFilter,
  finder: dateTimeFinder
};

registerComponent('TyrDateTime', TyrDateTime);
