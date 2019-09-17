import * as React from 'react';

import { Tyr } from 'tyranid/client';

import {
  assertTypeUi,
  TyrTypeProps,
  withTypeContext,
  FieldState
} from '../type/type';
import { SelectedValue } from 'antd/lib/select';
import { Moment } from 'moment'

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
  sortComparator?: (a:Tyr.Document, b:Tyr.Document) => number;  
  searchRange?: [number,number] | [Moment, Moment];
  filterOptionRenderer?: (v:any) => React.ReactElement;
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

export const TyrFieldBase = (props: TyrTypeProps) => {
  const { path } = props;
  const { tail: field } = path;
  const { type } = field;
  const typeUi = assertTypeUi(type.name);
  return React.createElement(typeUi.component, props);
};

export const TyrField = withTypeContext(TyrFieldBase);
