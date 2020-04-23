import * as React from 'react';
import { useEffect } from 'react';

import { Slider, InputNumber } from 'antd';
import { SliderValue } from 'antd/lib/slider';

import { Tyr } from 'tyranid/client';

import { mapPropsToForm, onTypeChange } from './type';
import { TyrFilter } from '../core/filter';
import { byName, TyrTypeProps } from './type';
import { decorateField } from '../core';
import { registerComponent } from '../common';
import { withThemedTypeContext } from '../core/theme';

export const TyrIntegerBase = <D extends Tyr.Document = Tyr.Document>(
  props: TyrTypeProps<D>
) => {
  useEffect(() => mapPropsToForm(props), [props.path && props.path.name]);

  return decorateField('integer', props, () => {
    return (
      <InputNumber
        {...(props.searchRange
          ? {
              min: props.searchRange[0] as number,
              max: props.searchRange[1] as number,
            }
          : {})}
        onChange={ev => onTypeChange(props, ev, undefined)}
        placeholder={props.placeholder}
        tabIndex={props.tabIndex}
        precision={0}
        step="1"
        {...(props.min !== undefined && { min: props.min })}
        {...(props.max !== undefined && { max: props.max })}
      />
    );
  });
};

export const TyrInteger = withThemedTypeContext('integer', TyrIntegerBase);

byName.integer = {
  component: TyrIntegerBase,
  filter(component, props) {
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
        : { max: 100 }),
    };

    return {
      filterDropdown: filterDdProps => (
        <TyrFilter<SliderValue>
          typeName="integer"
          component={component}
          filterDdProps={filterDdProps}
          pathProps={props}
        >
          {(searchValue, setSearchValue) => (
            <Slider
              range
              {...sliderProps}
              value={searchValue || (defaultValue.slice() as [number, number])}
              onChange={setSearchValue}
            />
          )}
        </TyrFilter>
      ),
      onFilter: (value: number[] | undefined, doc: Tyr.Document) => {
        if (value === undefined) return true;
        const intVal = (path.get(doc) as number) || 0;
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
  },
  finder(path, opts, searchValue) {
    if (searchValue) {
      if (!opts.query) opts.query = {};

      const searchParams = [
        { [path.spath]: { $gte: searchValue[0] } },
        { [path.spath]: { $lte: searchValue[1] } },
      ];

      if (opts.query.$and) {
        opts.query.$and = [...opts.query.$and, ...searchParams];
      } else {
        opts.query.$and = searchParams;
      }
    }
  },
};

registerComponent('TyrInteger', TyrInteger);
