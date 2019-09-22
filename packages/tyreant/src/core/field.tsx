import * as React from 'react';

import { Tyr } from 'tyranid/client';

import {
  assertTypeUi,
  TyrTypeProps,
  withTypeContext,
  FieldState,
  generateRules,
  className
} from '../type/type';
import { SelectedValue } from 'antd/lib/select';
import { Moment } from 'moment';
import FormItem from 'antd/lib/form/FormItem';
import { Tooltip, Icon } from 'antd';

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
  renderField?: (
    doc: Tyr.Document,
    options?: Tyr.Document[]
  ) => React.ReactElement;
  renderDisplay?: (doc: Tyr.Document) => React.ReactElement;

  /**
   * Suppress the default generation of field labels.
   */
  noLabel?: boolean;

  // fixed array display format
  fixedField?: string;

  // key-value display format -- field must be an array
  keyField?: string;
  keyFieldClass?: string;
  keyFieldDefault?: string; // the default value to set the key field control to (label)
  valueField?: string;

  defaultSort?: TyrSortDirection;
  dropdownClassName?: string;
  width?: string;
  filter?: (string | number)[];
  onSelect?: (value: SelectedValue, option: React.ReactElement<any>) => any;
  onDeselect?: (value: SelectedValue) => any;
  onStateChange?: (value: FieldState) => void;
  autoFocus?: boolean;
  required?: boolean;
  sortComparator?: (a: Tyr.Document, b: Tyr.Document) => number;
  searchRange?: [number, number] | [Moment, Moment];
  tabIndex?: number;
  filterOptionRenderer?: (value: any) => React.ReactElement;
  filterOptionLabel?: (doc: Tyr.Document) => { $id: any; $label: string };
  searchOptionRenderer?: (optionDocument: Tyr.Document) => React.ReactElement;
  searchSortById?: boolean;
  liveSearch?: boolean;
  translateForWhiteLabel?: (label: string) => string;
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
  name: string,
  props: TyrTypeProps,
  component: () => React.ReactElement
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

  let label;
  if (!props.noLabel) {
    const { help } = field.def;

    label = (
      <>
        {field.label}
        {help && (
          <Tooltip title={help}>
            &nbsp;<Icon type="exclamation-circle" />
          </Tooltip>
        )}
      </>
    );
  }

  return (
    <FormItem
      key={field!.path}
      className={className('tyr-' + name, props)}
      label={label}
    >
      {form.getFieldDecorator(path.identifier, {
        rules: generateRules(props),
        preserve: true
      })(
        props.renderField && props.document
          ? props.renderField(props.document)
          : component()
      )}
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
