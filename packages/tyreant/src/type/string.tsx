import * as React from 'react';
import { useEffect } from 'react';

import { Tyr } from 'tyranid/client';

import { Button, Icon, Input } from 'antd';

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

export const TyrStringBase = ((props: TyrTypeProps) => {
  const { path, form } = props;

  useEffect(() => {
    mapPropsToForm(props);
  }, []);

  console.log(path.identifier, ' +s+');
  return form!.getFieldDecorator(path.identifier, {
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
  filterable: Filterable
) => {
  const pathName = path.name;
  let searchInputRef: Input | null = null;
  const { detail: field } = path;

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
      path
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
