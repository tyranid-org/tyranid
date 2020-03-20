import * as React from 'react';
import { useEffect } from 'react';

import { Checkbox } from 'antd';
import { CheckboxChangeEvent } from 'antd/es/checkbox';

import { Tyr } from 'tyranid/client';

import {
  byName,
  mapPropsToForm,
  TyrTypeProps,
  withTypeContext,
  onTypeChange
} from './type';
import { TyrFilter, Filter, Filterable, Finder } from '../core/filter';
import { TyrPathProps, decorateField } from '../core';
import { registerComponent } from '../common';

export const TyrBooleanBase: React.FunctionComponent<TyrTypeProps> = props => {
  useEffect(() => mapPropsToForm(props), [props.path && props.path.name]);

  return decorateField('boolean', props, () => {
    const onTypeChangeFunc = (ev: any) => {
      onTypeChange(props, ev.target.value, ev);
      props.onChange && props.onChange(ev.target.value, ev, props);
    };

    return (
      <Checkbox
        // autoComplete="off"
        autoFocus={props.autoFocus}
        onChange={onTypeChangeFunc}
        // tabIndex={props.tabIndex}
      />
    );
  });
};

export const TyrBoolean = withTypeContext('boolean', TyrBooleanBase);

export const booleanFilter: Filter = (
  filterable: Filterable,
  props: TyrPathProps
) => {
  const path = props.path!;
  const pathName = path.name;

  return {
    filterDropdown: filterDdProps => (
      <TyrFilter<any>
        typeName="boolean"
        filterable={filterable}
        filterDdProps={filterDdProps}
        pathProps={props}
      >
        {(searchValue, setSearchValue, search) => {
          const valueLabels = props.filterValues;

          // First values is the "No" label and second is the "Yes" label
          return (
            <>
              <Checkbox
                style={{ display: 'block', marginLeft: '8px' }}
                checked={
                  filterable.searchValues[pathName] &&
                  !!filterable.searchValues[pathName]['no']
                }
                onChange={(e: CheckboxChangeEvent) => {
                  if (!searchValue) setSearchValue({});
                  searchValue['no'] = !searchValue.no;
                }}
              >
                {valueLabels ? valueLabels[0].$label : 'No'}
              </Checkbox>
              <Checkbox
                style={{ display: 'block' }}
                checked={
                  filterable.searchValues[pathName] &&
                  !!filterable.searchValues[pathName]['yes']
                }
                onChange={(e: CheckboxChangeEvent) => {
                  if (!searchValue) setSearchValue({});
                  searchValue['yes'] = !searchValue.yes;
                }}
              >
                {valueLabels ? valueLabels[1].$label : 'Yes'}
              </Checkbox>
            </>
          );
        }}
      </TyrFilter>
    ),
    onFilter: (value: { no: boolean; yes: boolean }, doc: Tyr.Document) => {
      if (props.onFilter) {
        return props.onFilter(value, doc);
      }

      if (value !== undefined) {
        const selectYes = !!value.yes;
        const selectNo = !!value.no;

        if (selectYes && selectNo) {
          return true;
        }

        const isTrue = !!path.get(doc);

        if (!!value.yes) {
          return isTrue;
        }

        if (!!value.no) {
          return !isTrue;
        }
      }

      return true;
    }
  };
};

export const booleanFinder: Finder = (
  path: Tyr.NamePathInstance,
  opts: Tyr.anny /* Tyr.Options_Find */,
  searchValue: Tyr.anny
) => {
  if (searchValue) {
    if (!opts.query) opts.query = {};
    opts.query[path.name] = !!searchValue;
  }
};

byName.boolean = {
  component: TyrBooleanBase,
  filter: booleanFilter,
  finder: booleanFinder
};

registerComponent('TyrBoolean', TyrBoolean);
