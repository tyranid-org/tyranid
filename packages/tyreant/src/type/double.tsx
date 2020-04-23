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

export const TyrDoubleBase = <D extends Tyr.Document = Tyr.Document>(
  props: TyrTypeProps<D>
) => {
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
              max: props.searchRange[1] as number,
            }
          : {})}
        onChange={onTypeChangeFunc}
        placeholder={props.placeholder}
        tabIndex={props.tabIndex}
        step={0.1}
        {...(props.min !== undefined && { min: props.min })}
        {...(props.max !== undefined && { max: props.max })}
      />
    );
  });
};

export const TyrDouble = withThemedTypeContext('double', TyrDoubleBase);

byName.double = {
  component: TyrDoubleBase,
  filter(component, props) {
    const path = props.path!;
    const pathName = path.name;

    const sliderProps = {
      ...(props.searchRange
        ? { min: props.searchRange[0] as number }
        : { min: 0 }),
      ...(props.searchRange
        ? { max: props.searchRange[1] as number }
        : { max: 100 }),
    };

    const defaultValue: SliderValue =
      component.searchValues[pathName] ||
      ((props.searchRange
        ? (props.searchRange as SliderValue)
        : [0, 100]) as SliderValue);

    return {
      // maybe use a different UI than integer?
      filterDropdown: filterDdProps => (
        <TyrFilter<SliderValue>
          typeName="double"
          component={component}
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

registerComponent('TyrDouble', TyrDouble);
