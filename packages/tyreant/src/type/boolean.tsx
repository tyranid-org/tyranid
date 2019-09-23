import * as React from 'react';
import { useEffect } from 'react';

import { Tyr } from 'tyranid/client';

import { Button, Checkbox } from 'antd';

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
import { CheckboxChangeEvent } from 'antd/es/checkbox';

export const TyrBooleanBase = ((props: TyrTypeProps) => {
  useEffect(() => {
    mapPropsToForm(props);
  }, []);

  return decorateField('boolean', props, () => (
    <Checkbox
      // autoComplete="off"
      autoFocus={props.autoFocus}
      onChange={ev => onTypeChange(props, ev.target.value, ev)}
      tabIndex={props.tabIndex}
    />
  ));
}) as React.ComponentType<TyrTypeProps>;

export const TyrBoolean = withTypeContext(TyrBooleanBase);

export const booleanFilter: Filter = (
  path: Tyr.NamePathInstance,
  filterable: Filterable,
  props: TyrFieldLaxProps
) => {
  const pathName = path.name;
  // const { detail: field } = path;
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
    filterDropdown: (filterDdProps: FilterDropdownProps) => {
      return (
        <div className="search-box">
          <Checkbox
            style={{ display: 'block', marginLeft: '8px' }}
            checked={
              filterable.searchValues[pathName] &&
              !!filterable.searchValues[pathName]['no']
            }
            onChange={(e: CheckboxChangeEvent) => {
              let set = filterable.searchValues[pathName];

              if (!set) {
                set = {};
                filterable.searchValues[pathName] = set;
              }

              set['no'] = !!e.target.checked;

              if (props.liveSearch) {
                filterable.onFilterChange();
              }
            }}
          >
            No
          </Checkbox>
          <Checkbox
            style={{ display: 'block' }}
            checked={
              filterable.searchValues[pathName] &&
              !!filterable.searchValues[pathName]['yes']
            }
            onChange={(e: CheckboxChangeEvent) => {
              let set = filterable.searchValues[pathName];

              if (!set) {
                set = {};
                filterable.searchValues[pathName] = set;
              }

              set['yes'] = !!e.target.checked;

              if (props.liveSearch) {
                filterable.onFilterChange();
              }
            }}
          >
            Yes
          </Checkbox>

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
      );
    },
    onFilter: (value: { no: boolean; yes: boolean }, doc: Tyr.Document) => {
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
