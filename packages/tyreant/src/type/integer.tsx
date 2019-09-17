import * as React from 'react';
import { useEffect, useState } from 'react';

import { Input } from 'antd';

import { mapPropsToForm } from './type';

import {
  byName,
  className,
  generateRules,
  TyrTypeProps,
  withTypeContext
} from './type';

export const TyrIntegerBase = ((props: TyrTypeProps) => {
  const { path, form } = props;
  const val = useState(props.form.getFieldsValue(['value'])['value']);

  useEffect(() => {
    mapPropsToForm(props);
  }, []);

  return form!.getFieldDecorator(path.identifier, {
    rules: generateRules(props)
  })(
    <Input
      className={className('tyr-integer', props)}
      step="1"
      type="number"
      placeholder={props.placeholder}
    />
  );
}) as React.ComponentType<TyrTypeProps>;

export const TyrInteger = withTypeContext(TyrIntegerBase);
/*
export const integerFilter: Filter = (
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
*/

/*
export const stringFinder: Finder = (
  field: Tyr.FieldInstance,
  opts: Tyr.anny, // Tyr.Options_Find,
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
*/

byName.integer = {
  component: TyrIntegerBase
  //filter: integerFilter,
  //finder: integerFinder
};
