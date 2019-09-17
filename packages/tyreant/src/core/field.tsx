import * as React from 'react';

import { Tyr } from 'tyranid/client';

import {
  assertTypeUi,
  TyrTypeProps,
  withTypeContext,
  FieldState,
  generateRules
} from '../type/type';
import { SelectedValue } from 'antd/lib/select';
import { Moment } from 'moment';
import FormItem from 'antd/lib/form/FormItem';

export type TyrSortDirection = 'ascend' | 'descend';

export interface TyrFieldProps {
  field?: Tyr.FieldInstance;
  label?: string | React.ReactNode;
  className?: string;
  placeholder?: string;
  mode?: 'view' | 'edit' | 'search';
  multiple?: boolean;

  /**
   * This indicates that the following render function should be used to render values.  If render is specified
   * then field is not required/needed.
   */
  render?: (doc: Tyr.Document) => React.ReactElement;

  /**
   * Suppress the default generation of field labels.
   */
  noLabel?: boolean;

  // fixed array display format
  fixedField?: string;

  // key-value display format -- field must be an array
  keyField?: string;
  keyFieldDefault?: string; // the default value to set the key field control to (label)
  valueField?: string;

  defaultSort?: TyrSortDirection;
  width?: string;
  filter?: (string | number)[];
  onSelect?: (value: SelectedValue, option: React.ReactElement<any>) => any;
  onDeselect?: (value: SelectedValue) => any;
  onStateChange?: (value: FieldState) => void;
  autoFocus?: boolean;
  required?: boolean;
  sortComparator?: (a: Tyr.Document, b: Tyr.Document) => number;
  searchRange?: [number, number] | [Moment, Moment];
  filterOptionRenderer?: (v: any) => React.ReactElement;
  searchOptionRenderer?: (v: any) => React.ReactElement;
  searchSortById?: boolean;
  liveSearch?: boolean;
}

export type TyrFieldExistsProps = Omit<TyrFieldProps, 'field'> & {
  field: Tyr.FieldInstance;
};

export const getFieldName = (field: string | Tyr.FieldInstance | undefined) => {
  if (typeof field === 'string') return field;
  if (field) return field.path;
  //return undefined;
};

export type TyrFieldLaxProps = Omit<TyrFieldProps, 'field'> & {
  field?: Tyr.FieldInstance | string;
};

export const decorateField = (
  props: TyrTypeProps,
  component: React.ReactElement
) => {
  const { path, form } = props;
  const { tail: field } = path;

  /*
     WARNING!

     There seems to be a hard dependency inside ant's form handling where the following need to be immediately
     descended from each other:

       FormItem
         getFieldDecorator()
           input control

     If you inject other components/dom objects (like a div) in between any of those three ant's form handling
     breaks down.

   */
  return (
    <FormItem
      key={field!.path}
      label={
        props.noLabel ? (
          undefined
        ) : (
          <label htmlFor={field.path}>{field.label}</label>
        )
      }
    >
      {form.getFieldDecorator(path.identifier, {
        rules: generateRules(props)
      })(component)}
    </FormItem>
  );
};

export const TyrFieldBase = (props: TyrTypeProps) => {
  const { path } = props;
  const { tail: field } = path;
  const { type } = field;
  const typeUi = assertTypeUi(type.name);
  return React.createElement(typeUi.component, props);
};

export const TyrField = withTypeContext(TyrFieldBase);
