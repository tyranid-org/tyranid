import * as React from 'react';

import { Tyr } from 'tyranid/client';

import {
  assertTypeUi,
  TyrTypeProps,
  withTypeContext,
  FieldState
} from '../type/type';
import { SelectedValue } from 'antd/lib/select';

export type TyrSortDirection = 'ascend' | 'descend';

export interface TyrFieldProps {
  field?: Tyr.FieldInstance;
  label?: string;
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
   * What table column grouping should this be grouped under.
   */
  group?: string;

  // key-value display format -- field must be an array
  keyField?: string;
  valueField?: string;

  defaultSort?: TyrSortDirection;
  width?: string;
  filter?: (string | number)[];
  onSelect?: (value: SelectedValue, option: React.ReactElement<any>) => any;
  onDeselect?: (value: SelectedValue) => any;
  onStateChange?: (value: FieldState) => void;
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

export const TyrFieldBase = ((props: TyrTypeProps) => {
  const { path } = props;
  const { detail: field } = path;
  const { type } = field;
  const typeUi = assertTypeUi(type.name);
  return React.createElement(typeUi.component, props);
}) as React.ComponentType<TyrTypeProps>;

export const TyrField = withTypeContext(TyrFieldBase);
