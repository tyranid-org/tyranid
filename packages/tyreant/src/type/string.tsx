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

export const TyrStringBase = ((props: TyrTypeProps) => {
  useEffect(() => {
    mapPropsToForm(props);
  }, []);

  return decorateField(
    'string',
    props,
    props.renderField && props.document ? (
      props.renderField(props.document)
    ) : (
      <Input
        autoComplete="off"
        type="text"
        tabIndex={props.tabIndex}
        autoFocus={props.autoFocus}
        placeholder={props.placeholder}
        onChange={ev => onTypeChange(props, ev.target.value)}
      />
    )
  );
}) as React.ComponentType<TyrTypeProps>;

export const TyrString = withTypeContext(TyrStringBase);

export const stringFilter: Filter = (
  path: Tyr.NamePathInstance,
  filterable: Filterable,
  props: TyrFieldLaxProps
) => {
  const pathName = path.name;
  let searchInputRef: Input | null = null;
  const { detail: field } = path;
  const { localSearch } = filterable;

  const onClearFilters = (clearFilters?: (selectedKeys: string[]) => void) => {
    delete filterable.searchValues[pathName];

    clearFilters && clearFilters([]);

    if (localSearch) {
      filterable.onFilterChange();
    } else {
      filterable.onSearch();
    }
  };

  return {
    filterDropdown: (filterDdProps: FilterDropdownProps) => (
      <div className="search-box">
        <Input
          ref={node => {
            searchInputRef = node;
          }}
          placeholder={`Search ${props.label || field.label}`}
          value={filterable.searchValues[pathName]}
          onChange={e => {
            filterable.searchValues[pathName] = e.target.value;

            if (props.liveSearch) {
              filterable.onFilterChange();
            }
          }}
          onPressEnter={() => {
            if (localSearch) {
              filterDdProps.confirm && filterDdProps.confirm();
              filterable.onFilterChange();
            } else {
              filterable.onSearch();
            }
          }}
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
              onClick={() => {
                if (localSearch) {
                  filterable.onFilterChange();
                } else {
                  filterable.onSearch();
                }

                filterDdProps.confirm && filterDdProps.confirm();
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
    ),
    onFilter: (value: string, doc: Tyr.Document) => {
      if (value !== undefined) {
        return path
          .get(doc)
          .toString()
          .toLowerCase()
          .includes(value.toLowerCase());
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
