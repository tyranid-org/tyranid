import * as React from 'react';
import { useEffect } from 'react';
import * as moment from 'moment';
import { Moment } from 'moment'

import { Tyr } from 'tyranid/client';

import { DatePicker, Button } from 'antd';
const { RangePicker } = DatePicker;

import {
  byName,
  generateRules,
  TyrTypeProps,
  className,
  mapPropsToForm,
  Finder,
  Filter,
  Filterable
} from './type';
import { withTypeContext } from './type';
import { TyrFieldLaxProps } from '../core';

const DATE_FORMAT= 'MM/DD/YYYY';

export const TyrDateBase = ((props: TyrTypeProps) => {
  const { path, form } = props;

  useEffect(() => {
    mapPropsToForm(props);
  }, []);

  return form.getFieldDecorator(path.name, {
    rules: generateRules(props)
  })(
    <DatePicker className={className('tyr-date', props)} allowClear={false} autoFocus={props.autoFocus} placeholder={props.placeholder}/>

    
  );
}) as React.ComponentType<TyrTypeProps>;

export const TyrDate = withTypeContext(TyrDateBase);

export const dateFilter: Filter = (
  path: Tyr.NamePathInstance,
  filterable: Filterable,
  props: TyrFieldLaxProps
) => {
  
  const pathName = path.name;
  const minDate = moment();
  minDate.subtract(1, 'year');

  const range = props.searchRange || [minDate, moment()];

  const onClearFilters = () => {
    filterable.searchValues[pathName] = range;
    filterable.onSearch();
  };

  filterable.searchValues[pathName] = filterable.searchValues[pathName] || range;

  return {
    filterDropdown: (
      <div className="search-box">
        <RangePicker
          value={filterable.searchValues[pathName] || range}
          defaultValue={range as [Moment,Moment]}
          format={DATE_FORMAT}
          onChange={ a => {
            filterable.searchValues[pathName] = a;
            filterable.onFilterChange();
            filterable.onSearch()
          }}
          //style={{ width: 188, marginBottom: 8, display: 'block' }}
        />
        <div className="search-box-footer">
          <Button
            onClick={() => onClearFilters()}
            size="small"
            style={{ width: 90 }}
          >
            Reset
          </Button>
          <Button
            type="primary"
            onClick={() => filterable.onSearch()}
            icon="search"
            size="small"
            style={{ width: 90 }}
          >
            Search
          </Button>
        </div>
      </div>
    ),
    onFilter: (value: number[], doc: Tyr.Document) => {
      const intVal = path.get(doc) as number || 0;
      return intVal >= value[0] && intVal <= value[1];
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
      $and: [
        { $gte : searchValue[0] },
        { $lte : searchValue[1] }
      ]
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

