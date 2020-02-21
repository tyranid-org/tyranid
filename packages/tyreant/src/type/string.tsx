import * as React from 'react';
import { useEffect } from 'react';

import { Tyr } from 'tyranid/client';

import { Button, Input } from 'antd';

import {
  byName,
  mapPropsToForm,
  TyrTypeProps,
  Filter,
  Filterable,
  Finder,
  withTypeContext,
  onTypeChange
} from './type';
import { TyrFieldLaxProps, decorateField } from '../core';
import { FilterDropdownProps } from 'antd/es/table';
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
  path: Tyr.NamePathInstance,
  filterable: Filterable,
  props: TyrFieldLaxProps
) => {
  const pathName = path.name;
  let searchInputRef: Input | null = null;
  const { detail: field } = path;
  let localValue = filterable.searchValues[pathName];
  let searchValue = localValue;

  const onClearFilters = (clearFilters?: (selectedKeys: string[]) => void) => {
    delete filterable.searchValues[pathName];
    localValue = undefined;
    searchValue = undefined;
    clearFilters?.([]);
    filterable.onSearch();
  };

  return {
    filterDropdown: (filterDdProps: FilterDropdownProps) => {
      const search = (onChange?: boolean) => {
        filterable.searchValues[pathName] = searchValue;
        filterable.onSearch();
        if (!onChange) filterDdProps.confirm?.();
      };

      return (
        <div className="search-box">
          <Input
            ref={node => {
              searchInputRef = node;
            }}
            placeholder={`Search ${props.label || field.label}`}
            defaultValue={localValue}
            onChange={e => {
              searchValue = e.target.value;
              if (props.liveSearch) search(true);
              else filterDdProps.setSelectedKeys?.([searchValue]);
            }}
            onPressEnter={() => search()}
            style={{ width: 188, marginBottom: 8, display: 'block' }}
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
                onClick={() => search()}
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
    onFilter: (value: string, doc: Tyr.Document) => {
      if (value !== undefined) {
        const v = path.get(doc);

        if (v) {
          return v
            .toString()
            .toLowerCase()
            .includes(value.toLowerCase());
        }

        return false;
      }

      return true;
    },
    onFilterDropdownVisibleChange: (visible: boolean) => {
      if (visible) {
        setTimeout(() => searchInputRef!.focus());
      }
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
