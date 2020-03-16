import * as React from 'react';
import { useEffect } from 'react';

import { Tyr } from 'tyranid/client';

import { Input } from 'antd';

import { byName, mapPropsToForm, TyrTypeProps, onTypeChange } from './type';
import { withThemedTypeContext } from '../core/theme';
import {
  TyrFilter,
  Filter,
  Filterable,
  FilterDdProps,
  Finder
} from '../core/filter';
import { TyrPathProps, decorateField } from '../core';
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

export const TyrString = withThemedTypeContext('string', TyrStringBase);

export const stringFilter: Filter = (
  filterable: Filterable,
  props: TyrPathProps
) => {
  const { path } = props;
  //let searchInputRef: Input | null = null;

  return {
    filterDropdown: (filterDdProps: FilterDdProps) => (
      <TyrFilter<string>
        typeName="string"
        filterable={filterable}
        filterDdProps={filterDdProps}
        pathProps={props}
      >
        {(searchValue, setSearchValue, search) => (
          <Input
            //ref={node => {
            //searchInputRef = node;
            //}}
            placeholder={`Search ${props.label || path!.pathLabel}`}
            value={searchValue}
            onChange={e => {
              setSearchValue(e.target.value);
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
            .path!.get(doc)
            ?.toString()
            .toLowerCase()
            .includes(value.toLowerCase()) ?? false
        : true;
    },
    onFilterDropdownVisibleChange: (visible: boolean) => {
      //if (visible) setTimeout(() => searchInputRef!.focus());
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
