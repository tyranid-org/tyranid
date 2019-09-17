import * as React from 'react';
import { useEffect, useState } from 'react';
import { Tyr } from 'tyranid/client';

import { Input, Slider, Button } from 'antd';

import { mapPropsToForm, Filter, Filterable, Finder } from './type';

import {
  byName,
  className,
  generateRules,
  TyrTypeProps,
  withTypeContext
} from './type';
import { SliderValue } from 'antd/lib/slider';
import { TyrFieldLaxProps } from '../core';
import { FilterDropdownProps } from 'antd/es/table';

export const TyrIntegerBase = ((props: TyrTypeProps) => {
  const { path, form } = props;
  const val = useState(props.form.getFieldsValue(['value'])['value']);

  useEffect(() => {
    mapPropsToForm(props);
  }, []);

  return form!.getFieldDecorator(path.name, {
    rules: generateRules(props)
  })(
    <Input className={className('tyr-integer', props)} step="1" type="number" placeholder={props.placeholder}/>
  );
}) as React.ComponentType<TyrTypeProps>;

export const TyrInteger = withTypeContext(TyrIntegerBase);

export const integerFilter: Filter = (
  path: Tyr.NamePathInstance,
  filterable: Filterable,
  props: TyrFieldLaxProps
) => {
  const pathName = path.name;
  const { localSearch} = filterable;

  const onClearFilters = (clearFilters?:  (selectedKeys: string[]) => void) => {
    delete filterable.searchValues[pathName];

    clearFilters && clearFilters([]);

    if (localSearch) {    
      filterable.onFilterChange();
    } else {
      filterable.onSearch();
    }
  };

  filterable.searchValues[pathName] = filterable.searchValues[pathName];

  const sliderProps = {
    ...( props.searchRange ? { min : props.searchRange[0] as number } : {} ),
    ...( props.searchRange ? { max : props.searchRange[1] as number } : {} )
  };

  return {
    filterDropdown: (filterDdProps: FilterDropdownProps) => (
      <div className="search-box">
        <Slider 
          range
          {...sliderProps}          
          defaultValue={props.searchRange ? props.searchRange as [number,number] : [0,100] }
          onChange={ (e:SliderValue) => {
            filterable.searchValues[pathName] = e;

            if (props.liveSearch) {
              filterable.onFilterChange();
            }
          }}
          style={{ width: 188 }}
        />
        <div className="search-box-footer">
          <Button
            onClick={() => onClearFilters(filterDdProps.clearFilters)}
            size="small"
            style={{ width: 90 }}
          >
            Reset
          </Button>
          {!props.liveSearch && 
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
          }
        </div>
      </div>
    ),
    onFilter: (value: number[], doc: Tyr.Document) => {
      const intVal = path.get(doc) as number || 0;
      return intVal >= value[0] && intVal <= value[1];
    },
    /*
    onFilterDropdownVisibleChange: (visible: boolean) => {
      if (visible) {
        setTimeout(() => searchInputRef!.focus());
      }
    }
    */
  };
};

export const integerFinder: Finder = (
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

byName.integer = {
  component: TyrIntegerBase,
  filter: integerFilter,
  finder: integerFinder
};
