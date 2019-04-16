import * as React from 'react';

import { Tyr } from 'tyranid/client';

import { Button, Icon, Input } from 'antd';

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

export const TyrStringBase = ((props: TyrTypeProps) => {
  const { field, form } = props;

  return form!.getFieldDecorator(field.path, {
    rules: generateRules(field)
  })(
    <Input
      className={className('tyr-string', props)}
      autoComplete="off"
      type="text"
    />
  );
}) as React.ComponentType<TyrTypeProps>;

export const TyrString = withTypeContext(TyrStringBase);

export const stringFilter: Filter = (
  field: Tyr.FieldInstance,
  filterable: Filterable
) => {
  const { namePath } = field;
  const pathName = field.path;
  let searchInputRef: Input | null = null;

  const onClearFilters = () => {
    filterable.searchValues[pathName] = '';
    filterable.onSearch();
  };

  filterable.searchValues[pathName] = filterable.searchValues[pathName] || '';

  return {
    filterDropdown: (
      <div className="searchBox">
        <Input
          ref={node => {
            searchInputRef = node;
          }}
          placeholder={`Search ${field.label}`}
          value={filterable.searchValues[pathName]}
          onChange={e => {
            filterable.searchValues[pathName] = e.target.value;
            filterable.onFilterChange();
          }}
          onPressEnter={() => filterable.onSearch()}
          style={{ width: 188, marginBottom: 8, display: 'block' }}
        />
        <Button
          type="primary"
          onClick={() => filterable.onSearch()}
          icon="search"
          size="small"
          style={{ width: 90, marginRight: 8 }}
        >
          Search
        </Button>
        <Button
          onClick={() => onClearFilters()}
          size="small"
          style={{ width: 90 }}
        >
          Reset
        </Button>
      </div>
    ),
    filterIcon: (
      <span>
        <Icon
          type="search"
          className={filterable.searchValues[pathName] ? 'active' : 'inactive'}
        />
      </span>
    ),
    onFilter: (value: string, doc: Tyr.Document) =>
      namePath
        .get(doc)
        .toString()
        .toLowerCase()
        .includes(value.toLowerCase()),
    onFilterDropdownVisibleChange: (visible: boolean) => {
      if (visible) {
        setTimeout(() => searchInputRef!.focus());
      }
    }
  };
};

export const stringFinder: Finder = (
  field: Tyr.FieldInstance,
  opts: Tyr.anny /* Tyr.Options_Find */,
  searchValue: Tyr.anny
) => {
  if (searchValue) {
    if (!opts.query) opts.query = {};
    opts.query[field.path] = {
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
