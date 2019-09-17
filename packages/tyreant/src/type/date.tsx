import * as React from 'react';
import { useEffect } from 'react';
import * as moment from 'moment';
import { Moment } from 'moment';

import { Tyr } from 'tyranid/client';

import { DatePicker, Button } from 'antd';
const { RangePicker } = DatePicker;

import {
  byName,
  TyrTypeProps,
  mapPropsToForm,
  Finder,
  Filter,
  Filterable
} from './type';
import { withTypeContext } from './type';
import { TyrFieldLaxProps, decorateField } from '../core';
import { FilterDropdownProps } from 'antd/es/table';

const DATE_FORMAT = 'MM/DD/YYYY';

export const TyrDateBase = ((props: TyrTypeProps) => {
  useEffect(() => {
    mapPropsToForm(props);
  }, []);

  return decorateField(
    'date',
    props,
    props.renderField && props.document ? (
      props.renderField(props.document)
    ) : (
      <DatePicker
        allowClear={false}
        autoFocus={props.autoFocus}
        placeholder={props.placeholder}
      />
    )
  );
}) as React.ComponentType<TyrTypeProps>;

export const TyrDate = withTypeContext(TyrDateBase);

export const dateFilter: Filter = (
  path: Tyr.NamePathInstance,
  filterable: Filterable,
  props: TyrFieldLaxProps
) => {
  const { localSearch } = filterable;
  const pathName = path.name;

  const onClearFilters = (clearFilters?: (selectedKeys: string[]) => void) => {
    delete filterable.searchValues[pathName];

    clearFilters && clearFilters([]);

    if (localSearch) {
      filterable.onFilterChange();
    } else {
      filterable.onSearch();
    }
  };

  filterable.searchValues[pathName] = filterable.searchValues[pathName];

  return {
    filterDropdown: (filterDdProps: FilterDropdownProps) => (
      <div className="search-box">
        <RangePicker
          value={filterable.searchValues[pathName]}
          format={DATE_FORMAT}
          onChange={v => {
            filterable.searchValues[pathName] = v;

            if (props.liveSearch) {
              filterable.onFilterChange();
              filterDdProps.confirm && filterDdProps.confirm();
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
                if (localSearch) {
                  filterable.onFilterChange();
                } else {
                  filterable.onSearch();
                }

                filterDdProps.confirm && filterDdProps.confirm();
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
    ),
    onFilter: (value: number[], doc: Tyr.Document) => {
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
  if (searchValue) {
    if (!opts.query) opts.query = {};
    opts.query[path.name] = {
      $and: [{ $gte: searchValue[0] }, { $lte: searchValue[1] }]
    };
  }
};

byName.date = {
  component: TyrDateBase,
  mapDocumentValueToFormValue(path: Tyr.NamePathInstance, value: Tyr.anny) {
    return value ? moment(value) : null;
  },
  filter: dateFilter
};
