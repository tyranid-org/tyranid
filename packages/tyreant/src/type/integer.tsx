import * as React from 'react';
import { useEffect } from 'react';

import { Slider, InputNumber, Select } from 'antd';
import { SliderValue } from 'antd/lib/slider';

import { Tyr } from 'tyranid/client';

import { mapPropsToForm, onTypeChange } from './type';
import { TyrFilter, FilterDdProps } from '../core/filter';
import { byName, TyrTypeProps } from './type';
import { decorateField } from '../core';
import { registerComponent } from '../common';
import { withThemedTypeContext } from '../core/theme';

const { Option } = Select;

const filterOptions = [
  'Equals',
  'Not equal',
  'Less Than',
  'Less Than or equals',
  'Greater than',
  'Greater than or equals',
];

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
        {...(props.formatter !== undefined && { formater: props.formatter })}
        {...(props.min !== undefined && { min: props.min })}
        {...(props.max !== undefined && { max: props.max })}
      />
    );
  });
};

export const TyrInteger = withThemedTypeContext('integer', TyrIntegerBase);

byName.integer = {
  component: TyrIntegerBase,
  cellValue: (
    path: Tyr.PathInstance,
    document: Tyr.Document,
    props: TyrTypeProps<any>
  ) => {
    const v = path.get(document);
    return props.formatter ? props.formatter(v as number) : v;
  },
  filter(component, props) {
    const path = props.path!;
    const { searchRange, searchNumber } = props;

    const sliderFilter = (filterDdProps: FilterDdProps) => {
      const defaultValue = (searchRange
        ? (searchRange as [number, number])
        : [0, 100]) as [number, number];

      const compProps = {
        ...(searchRange ? { min: searchRange[0] as number } : { min: 0 }),
        ...(searchRange ? { max: searchRange[1] as number } : { max: 100 }),
      };

      return (
        <TyrFilter<SliderValue>
          typeName="integer"
          component={component}
          filterDdProps={filterDdProps}
          pathProps={props}
        >
          {(searchValue, setSearchValue) => (
            <Slider
              range
              {...compProps}
              value={searchValue || (defaultValue.slice() as [number, number])}
              onChange={setSearchValue}
            />
          )}
        </TyrFilter>
      );
    };

    const numberFilter = (filterDdProps: FilterDdProps) => (
      <TyrFilter<[string, number?]>
        typeName="integer"
        component={component}
        filterDdProps={filterDdProps}
        pathProps={props}
      >
        {(searchValue, setSearchValue, search) => {
          const setSearchValueChoice = (choice: string) => {
            setSearchValue([choice, searchValue ? searchValue[1] : undefined]);
          };

          const setSearchValueNumber = (value?: number) => {
            setSearchValue([
              searchValue ? searchValue[0] : filterOptions[0],
              value,
            ]);
          };

          return (
            <React.Fragment>
              <Select
                defaultValue={searchValue ? searchValue[0] : filterOptions[0]}
                onChange={setSearchValueChoice}
                style={{ width: 188, marginBottom: 8, display: 'block' }}
              >
                {filterOptions.map(op => (
                  <Option key={op} value={op}>
                    {op}
                  </Option>
                ))}
              </Select>

              <InputNumber
                autoFocus={true}
                value={searchValue ? searchValue[1] : undefined}
                onChange={setSearchValueNumber}
                onPressEnter={() => search()}
                style={{ width: 188, marginBottom: 8, display: 'block' }}
              />
            </React.Fragment>
          );
        }}
      </TyrFilter>
    );

    return {
      filterDropdown: searchNumber ? numberFilter : sliderFilter,
      onFilter: (
        value: number[] | [string, number] | undefined,
        doc: Tyr.Document
      ) => {
        if (value === undefined) return true;
        const intVal = (path.get(doc) as number) || 0;

        if (searchNumber) {
          switch (value[0]) {
            case 'Equals':
              return intVal === value[1];
            case 'Not equal':
              return intVal !== value[1];
            case 'Less Than':
              return intVal < value[1];
            case 'Less Than or equals':
              return intVal <= value[1];
            case 'Greater than':
              return intVal > value[1];
            case 'Greater than or equals':
              return intVal >= value[1];
            default:
              throw new Error(`How did you pick this: ${value[0]} ?`);
          }
        }

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
  finder(path, opts, searchValue, pathProps) {
    if (searchValue) {
      if (!opts.query) opts.query = {};

      if (pathProps?.searchNumber) {
        let searchParams: object | undefined = undefined;

        switch (searchValue[0]) {
          case 'equals':
            searchParams = searchValue[1];
            break;
          case 'Not equal':
            searchParams = { $ne: searchValue[1] };
            break;
          case 'Less Than':
            searchParams = { $lt: searchValue[1] };
            break;
          case 'Less Than or equals':
            searchParams = { $lte: searchValue[1] };
            break;
          case 'Greater than':
            searchParams = { $gt: searchValue[1] };
            break;
          case 'Greater than or equals':
            searchParams = { $gte: searchValue[1] };
            break;
        }

        if (searchParams) {
          if (!opts.query) opts.query = {};
          opts.query[path.spathArr] = searchParams;
        }
      } else {
        const searchParams = [
          { [path.spathArr]: { $gte: searchValue[0] } },
          { [path.spathArr]: { $lte: searchValue[1] } },
        ];

        if (opts.query.$and) {
          opts.query.$and = [...opts.query.$and, ...searchParams];
        } else {
          opts.query.$and = searchParams;
        }
      }
    }
  },
};

registerComponent('TyrInteger', TyrInteger);
