import * as React from 'react';
import { useEffect } from 'react';

import { Tyr } from 'tyranid/client';

import { Button, Input } from 'antd';

import {
  byName,
  mapPropsToForm,
  TyrTypeProps,
  withTypeContext,
  onTypeChange
} from './type';
import {
  TyrFilter,
  Filter,
  Filterable,
  FilterDdProps,
  Finder
} from '../core/filter';
import { TyrFieldProps, decorateField } from '../core';
import { registerComponent } from '../common';

export const TyrStringBase = ((props: TyrTypeProps) => {
  useEffect(() => mapPropsToForm(props), [props.path?.name]);

  return decorateField('string', props, () => (
    <Input
      autoComplete="off"
      type="text"
      autoFocus={props.autoFocus}
      placeholder={props.placeholder}
      onChange={ev => onTypeChange(props, ev.target.value, ev)}
      tabIndex={props.tabIndex}
      className={props.className}
    />
  ));
}) as React.ComponentType<TyrTypeProps>;

export const TyrString = withTypeContext('string', TyrStringBase);

export const stringFilter: Filter = (
  filterable: Filterable,
  props: TyrFieldProps
) => {
  const { field } = props;
  let searchInputRef: Input | null = null;

  return {
    filterDropdown: (filterDdProps: FilterDdProps) => (
      <TyrFilter<string>
        typeName="string"
        filterable={filterable}
        filterDdProps={filterDdProps}
        fieldProps={props}
      >
        {(searchValue, setSearchValue, search) => (
          <Input
            ref={node => {
              searchInputRef = node;
            }}
            placeholder={`Search ${props.label || field!.label}`}
            value={searchValue}
            onChange={e => {
              setSearchValue(e.target.value);
              if (props.liveSearch) search(true);
              else filterDdProps.setSelectedKeys?.([searchValue!]);
            }}
            onPressEnter={() => search()}
            style={{ width: 188, marginBottom: 8, display: 'block' }}
          />
        )}
      </TyrFilter>
    ),
    onFilter: (value: string, doc: Tyr.Document) => {
      return value !== undefined
        ? props
            .field!.namePath.get(doc)
            ?.toString()
            .toLowerCase()
            .includes(value.toLowerCase()) ?? false
        : true;
    },
    onFilterDropdownVisibleChange: (visible: boolean) => {
      if (visible) setTimeout(() => searchInputRef!.focus());
    }
  };
};

export const stringFinder: Finder = (
  path: Tyr.NamePathInstance,
  opts: Tyr.anny /* Tyr.Options_Find */,
  searchValue: Tyr.anny
) => {
  if (searchValue) {
    if (!opts.query) opts.query = {};
    opts.query[path.name] = {
      $regex: searchValue,
      $options: 'i'
    };
  }
};

byName.string = {
  component: TyrStringBase,
  filter: stringFilter,
  finder: stringFinder
};

registerComponent('TyrString', TyrString);
