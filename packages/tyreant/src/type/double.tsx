import * as React from 'react';
import { useEffect } from 'react';
import { Tyr } from 'tyranid/client';

import { Slider, Button, InputNumber } from 'antd';

import {
  mapPropsToForm,
  Filter,
  Filterable,
  Finder,
  onTypeChange
} from './type';

import { byName, TyrTypeProps, withTypeContext } from './type';
import { SliderValue } from 'antd/lib/slider';
import { TyrFieldLaxProps, decorateField } from '../core';
import { FilterDropdownProps } from 'antd/es/table';

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
        precision={0}
        step="1"
      />
    );
  });
}) as React.ComponentType<TyrTypeProps>;

export const TyrDouble = withTypeContext(TyrDoubleBase);

export const doubleFilter: Filter = (
  path: Tyr.NamePathInstance,
  filterable: Filterable,
  props: TyrFieldLaxProps
) => {
  const pathName = path.name;

  const defaultValue = (props.searchRange
    ? (props.searchRange as [number, number])
    : [0, 100]) as [number, number];

  const onClearFilters = (clearFilters?: (selectedKeys: string[]) => void) => {
    delete filterable.searchValues[pathName];
    clearFilters?.([]);
    filterable.onSearch();
  };

  const sliderProps = {
    ...(props.searchRange
      ? { min: props.searchRange[0] as number }
      : { min: 0 }),
    ...(props.searchRange
      ? { max: props.searchRange[1] as number }
      : { max: 100 })
  };

  return {
    // maybe use a different UI than integer?
    filterDropdown: (filterDdProps: FilterDropdownProps) => {
      const values = filterable.searchValues[pathName];
      return (
        <div className="search-box">
          <Slider
            range
            {...sliderProps}
            value={values || (defaultValue.slice() as [number, number])}
            onChange={(e: SliderValue) => {
              filterable.searchValues[pathName] = e;

              if (props.liveSearch) filterable.onSearch();
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
