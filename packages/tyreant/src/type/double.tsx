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

export const TyrDoubleBase = ((props: TyrTypeProps) => {
  useEffect(() => mapPropsToForm(props), [props.path && props.path.name]);

  return decorateField('double', props, () => {
    const onTypeChangeFunc = (ev: any) => {
      onTypeChange(props, ev, null);
      props.onChange && props.onChange(ev, null, props);
    };

    return (
      <InputNumber
        {...(props.searchRange
          ? {
              min: props.searchRange[0] as number,
              max: props.searchRange[1] as number
            }
          : {})}
        onChange={onTypeChangeFunc}
        placeholder={props.placeholder}
        tabIndex={props.tabIndex}
        step={0.1}
      />
    );
  });
}) as React.ComponentType<TyrTypeProps>;

export const TyrDouble = withTypeContext('double', TyrDoubleBase);

export const doubleFilter: Filter = (
  filterable: Filterable,
  props: TyrPathProps
) => {
  const path = props.path!;
  const pathName = path.name;

  const sliderProps = {
    ...(props.searchRange
      ? { min: props.searchRange[0] as number }
      : { min: 0 }),
    ...(props.searchRange
      ? { max: props.searchRange[1] as number }
      : { max: 100 })
  };

  const defaultValue: SliderValue =
    filterable.searchValues[pathName] ||
    ((props.searchRange
      ? (props.searchRange as SliderValue)
      : [0, 100]) as SliderValue);

  return {
    // maybe use a different UI than integer?
    filterDropdown: filterDdProps => (
      <TyrFilter<SliderValue>
        typeName="double"
        filterable={filterable}
        filterDdProps={filterDdProps}
        pathProps={props}
      >
        {(searchValue, setSearchValue, search) => (
          <Slider
            range
            {...sliderProps}
            value={(searchValue || defaultValue) as SliderValue}
            onChange={(e: SliderValue) => {
              setSearchValue(e);
            }}
            style={{ width: 188 }}
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

export const doubleFinder: Finder = (
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

byName.double = {
  component: TyrDoubleBase,
  filter: doubleFilter,
  finder: doubleFinder
};

registerComponent('TyrDouble', TyrDouble);
