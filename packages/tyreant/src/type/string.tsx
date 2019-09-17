import * as React from 'react';
import { useEffect } from 'react';

import { Tyr } from 'tyranid/client';

import { Button, Input } from 'antd';

import { mapPropsToForm } from './type';

import {
  byName,
  className,
  generateRules,
  TyrTypeProps,
  Filter,
  Filterable,
  Finder,
  withTypeContext
} from './type';
import { TyrFieldLaxProps } from '../core';
import { FilterDropdownProps } from 'antd/es/table';

export const TyrStringBase = ((props: TyrTypeProps) => {
  const { path, form } = props;

  useEffect(() => {
    mapPropsToForm(props);
  }, [])

  return form!.getFieldDecorator(path.name, {
    rules: generateRules(props)
  })(
    <Input
      className={className('tyr-string', props)}
      autoComplete="off"
      type="text"
      autoFocus={props.autoFocus}
      placeholder={props.placeholder}
    />
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
  const { localSearch} = filterable;

  const onClearFilters = (clearFilters?:  (selectedKeys: string[]) => void) => {
    delete filterable.searchValues[pathName];

    clearFilters && clearFilters([]);

    if (localSearch) {    
      filterable.onFilterChange();
    } else {
      filterable.onSearch();
    }
  };

  filterable.searchValues[pathName] = filterable.searchValues[pathName];

  return {
    filterDropdown: (filterDdProps: FilterDropdownProps) => (
      <div className="search-box">
        <Input
          ref={node => {
            searchInputRef = node;
          }}
          placeholder={`Search ${field.label}`}
          defaultValue={filterable.searchValues[pathName]}
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

          { !props.liveSearch &&
            <Button
              type="primary"
              onClick={() => {
                  if (localSearch) {
                    filterable.onFilterChange(); 
                  } else {
                    filterable.onSearch();
                  }

                  filterDdProps.confirm && filterDdProps.confirm();
                }
              }
              icon="search"
              size="small"
              style={{ width: 90 }}
            >
              Search
            </Button>
          }
        </div>
      </div>
    ),
    onFilter: (value: string, doc: Tyr.Document) => {
      if (value) {
        return path
          .get(doc)
          .toString()
          .toLowerCase()
          .includes(value.toLowerCase())
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
