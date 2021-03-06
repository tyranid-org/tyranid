import * as React from 'react';
import { useEffect } from 'react';

import { Checkbox, Switch } from 'antd';
import { CheckboxChangeEvent } from 'antd/es/checkbox';

import { Tyr } from 'tyranid/client';

import { byName, mapPropsToForm, TyrTypeProps, onTypeChange } from './type';
import { TyrFilter } from '../core/filter';
import { renderFieldLabel } from '../core/label';
import { decorateField } from '../core';
import { registerComponent } from '../common';
import { withThemedTypeContext } from '../core/theme';

export const TyrBooleanBase = <D extends Tyr.Document = Tyr.Document>(
  props: TyrTypeProps<D>
) => {
  useEffect(() => {
    mapPropsToForm(props);
  }, [props.path && props.path.name, props.document]);

  const inlineLabel = props.as !== 'switch' && props.noLabel === undefined;

  if (inlineLabel) props = { noLabel: true, ...props };

  return decorateField('boolean', props, () => {
    const onTypeChangeFunc = (ev: any) => {
      const value =
        typeof ev !== 'boolean' ? ev.target.checked || ev.target.value : ev;
      onTypeChange(props, value, ev);
      props.onChange && props.onChange(value, ev, props);
    };

    return props.as === 'switch' ? (
      <Switch
        //autoComplete="off"
        autoFocus={props.autoFocus}
        onChange={onTypeChangeFunc}
      ></Switch>
    ) : (
      <Checkbox
        // autoComplete="off"
        autoFocus={props.autoFocus}
        onChange={onTypeChangeFunc}
        tabIndex={props.tabIndex}
      >
        {inlineLabel && renderFieldLabel(props)}
      </Checkbox>
    );
  });
};

export const TyrBoolean = withThemedTypeContext('boolean', TyrBooleanBase);

byName.boolean = {
  component: TyrBooleanBase,
  filter(component, props) {
    const path = props.path!;

    return {
      filterDropdown: filterDdProps => (
        <TyrFilter<any>
          typeName="boolean"
          component={component}
          filterDdProps={filterDdProps}
          pathProps={props}
          key={props?.path?.name}
        >
          {(searchValue, setSearchValue, search) => {
            const valueLabels = props.filterValues;

            // First values is the "No" label and second is the "Yes" label
            return (
              <>
                <Checkbox
                  key="no-choice"
                  style={{ display: 'block', marginLeft: '8px' }}
                  checked={searchValue && !!searchValue.no}
                  onChange={(e: CheckboxChangeEvent) => {
                    setSearchValue(
                      searchValue
                        ? { ...searchValue, no: !searchValue.no }
                        : { no: true }
                    );
                  }}
                >
                  {valueLabels ? valueLabels[0].$label : 'No'}
                </Checkbox>
                <Checkbox
                  key="yes-choice"
                  style={{ display: 'block' }}
                  checked={searchValue && !!searchValue.yes}
                  onChange={(e: CheckboxChangeEvent) => {
                    setSearchValue(
                      searchValue
                        ? { ...searchValue, yes: !searchValue.yes }
                        : { yes: true }
                    );
                  }}
                >
                  {valueLabels ? valueLabels[1].$label : 'Yes'}
                </Checkbox>
              </>
            );
          }}
        </TyrFilter>
      ),
      onFilter: (
        value: { no: boolean; yes: boolean } | undefined,
        doc: Tyr.Document
      ) => {
        if (value === undefined) return true;
        if (props.onFilter) {
          return props.onFilter(value, doc);
        }

        if (value !== undefined) {
          const selectYes = !!value.yes;
          const selectNo = !!value.no;

          if (selectYes && selectNo) {
            return true;
          }

          const isTrue = !!path.get(doc);

          if (selectYes) {
            return isTrue;
          }

          if (selectNo) {
            return !isTrue;
          }
        }

        return true;
      },
    };
  },

  finder(path, opts, searchValue) {
    if (searchValue) {
      const selectYes = !!searchValue.yes;
      const selectNo = !!searchValue.no;

      if (selectYes === selectNo) {
        return;
      }

      if (!opts.query) opts.query = {};

      opts.query[path.spathArr] = selectYes;
    }
  },
};

registerComponent('TyrBoolean', TyrBoolean);
