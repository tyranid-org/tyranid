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
  let searchInputRef: Slider | null = null;
  const range = props.searchRange || [0,100];

  const onClearFilters = () => {
    filterable.searchValues[pathName] = range;
    filterable.onSearch();
  };

  filterable.searchValues[pathName] = filterable.searchValues[pathName] || range;

  return {
    filterDropdown: (
      <div className="search-box">
        <Slider 
          ref={node => {
            searchInputRef = node;
          }}
          range 
          defaultValue={range as [number,number]} 
          value={filterable.searchValues[pathName] || range}
          onChange={ (e:SliderValue) => {
            filterable.searchValues[pathName] = e;
            filterable.onFilterChange();
            //filterable.onSearch()
            //style={{ width: 188, marginBottom: 8, display: 'block' }}
          }}
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
        setTimeout(() => searchInputRef!.focus());
      }
    }
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
