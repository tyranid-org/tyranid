import * as React from 'react';
import { useEffect } from 'react';

import { Slider, InputNumber } from 'antd';
import { SliderValue } from 'antd/lib/slider';

import { Tyr } from 'tyranid/client';

import { mapPropsToForm, onTypeChange } from './type';
import { TyrFilter, Finder, Filter, Filterable } from '../core/filter';
import { byName, TyrTypeProps, withTypeContext } from './type';
import { TyrPathProps, decorateField } from '../core';
import { registerComponent } from '../common';

export const TyrIntegerBase = ((props: TyrTypeProps) => {
  useEffect(() => mapPropsToForm(props), [props.path && props.path.name]);

  return decorateField('integer', props, () => {
    return (
      <InputNumber
        {...(props.searchRange
          ? {
              min: props.searchRange[0] as number,
              max: props.searchRange[1] as number
            }
          : {})}
        onChange={ev => onTypeChange(props, ev, undefined)}
        placeholder={props.placeholder}
        tabIndex={props.tabIndex}
        precision={0}
        step="1"
      />
    );
  });
}) as React.ComponentType<TyrTypeProps>;

export const TyrInteger = withTypeContext('integer', TyrIntegerBase);

export const integerFilter: Filter = (
  filterable: Filterable,
  props: TyrPathProps
) => {
  const path = props.path!;

  const defaultValue = (props.searchRange
    ? (props.searchRange as [number, number])
    : [0, 100]) as [number, number];

  const sliderProps = {
    ...(props.searchRange
      ? { min: props.searchRange[0] as number }
      : { min: 0 }),
    ...(props.searchRange
      ? { max: props.searchRange[1] as number }
      : { max: 100 })
  };

  return {
    filterDropdown: filterDdProps => (
      <TyrFilter<SliderValue>
        typeName="integer"
        filterable={filterable}
        filterDdProps={filterDdProps}
        pathProps={props}
      >
        {(searchValue, setSearchValue, search) => (
          <Slider
            range
            {...sliderProps}
            value={searchValue || (defaultValue.slice() as [number, number])}
            onChange={(e: SliderValue) => {
              setSearchValue(e);
              if (!props.liveSearch) filterable.onSearch();
            }}
          />
        )}
      </TyrFilter>
    ),
    onFilter: (value: number[], doc: Tyr.Document) => {
      const intVal = (path.get(doc) as number) || 0;
      return intVal >= value[0] && intVal <= value[1];
    }
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

    const searchParams = [
      { [path.name]: { $gte: searchValue[0] } },
      { [path.name]: { $lte: searchValue[1] } }
    ];

    if (opts.query.$and) {
      opts.query.$and = [...opts.query.$and, ...searchParams];
    } else {
      opts.query.$and = searchParams;
    }
  }
};

byName.integer = {
  component: TyrIntegerBase,
  filter: integerFilter,
  finder: integerFinder
};

registerComponent('TyrInteger', TyrInteger);
