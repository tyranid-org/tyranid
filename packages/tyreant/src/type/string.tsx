import * as React from 'react';
import { useEffect } from 'react';

import { Tyr } from 'tyranid/client';

import { Input } from 'antd';

import { byName, mapPropsToForm, TyrTypeProps, onTypeChange } from './type';
import { withThemedTypeContext } from '../core/theme';
import { TyrFilter, FilterDdProps } from '../core/filter';
import { decorateField, getValue } from '../core';
import { registerComponent } from '../common';

export const TyrStringBase = <D extends Tyr.Document = Tyr.Document>(
  props: TyrTypeProps<D>
) => {
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
      onPressEnter={props.onPressEnter}
    />
  ));
};

export const TyrString = withThemedTypeContext('string', TyrStringBase);

byName.string = {
  component: TyrStringBase,
  filter(component, props) {
    const { path } = props;
    //let searchInputRef: Input | null = null;

    return {
      filterDropdown: filterDdProps => (
        <TyrFilter<string>
          typeName="string"
          component={component}
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
              onChange={e => setSearchValue(e.target.value)}
              onPressEnter={() => search()}
              style={{ width: 188, marginBottom: 8, display: 'block' }}
            />
          )}
        </TyrFilter>
      ),
      onFilter: (value, doc) => {
        return value !== undefined
          ? props
              .path!.get(doc)
              ?.toString()
              .toLowerCase()
              .includes(value.toLowerCase()) ?? false
          : true;
      },
      onFilterDropdownVisibleChange: visible => {
        //if (visible) setTimeout(() => searchInputRef!.focus());
      },
    };
  },
  finder(path, opts, searchValue) {
    if (searchValue) {
      if (!opts.query) opts.query = {};
      opts.query[path.spath] = {
        $regex: searchValue,
        $options: 'i',
      };
    }
  },
  cellValue(path, document, props) {
    return <>{getValue(props, document)}</>;
  },
};

registerComponent('TyrString', TyrString);
