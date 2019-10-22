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
  searchField?: Tyr.FieldInstance;
  getSearchIds?: (val: any) => any[];

  label?: string | React.ReactNode;
  className?: string;
  placeholder?: string;
  dateFormat?: string | string[];
  default?: any;
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
  renderDisplay?: (doc: Tyr.Document) => React.ReactElement | string;

  /**
   * Do not show this field when creating new documents.
   */
  hideOnCreate?: boolean;

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
  width?: number | string;
  onChange?: (value: any, event: any, props: TyrTypeProps) => void;
  onSelect?: (value: SelectedValue, option: React.ReactElement<any>) => any;
  onDeselect?: (value: SelectedValue) => any;
  onStateChange?: (value: FieldState) => void;
  autoFocus?: boolean;
  required?: boolean;
  max?: number;
  sortComparator?: (a: Tyr.Document, b: Tyr.Document) => number;
  searchRange?: [number, number] | [Moment, Moment];
  tabIndex?: number;
  noFilter?: boolean;
  onFilter?: (value: any, doc: Tyr.Document) => boolean;
  filterOptionRenderer?: (value: any) => React.ReactElement;
  filterOptionLabel?: (
    doc: Tyr.Document
  ) =>
    | { $id: any; $label: string }
    | { $id: any; $label: string }[]
    | undefined;
  searchOptionRenderer?: (optionDocument: Tyr.Document) => React.ReactElement;
  searchSortById?: boolean;
  liveSearch?: boolean;
  defaultHidden?: boolean;
  readonly?: boolean;
  isEditable?: (document: Tyr.Document) => boolean;
  translateForWhiteLabel?: (label: string) => string;
  typeUi?:
    | 'link'
    | 'string'
    | 'integer'
    | 'boolean'
    | 'date'
    | 'datetime'
    | 'email'
    | undefined;
  mapDocumentValueToForm?: (value: any, document: Tyr.Document) => any;
  mapFormValueToDocument?: (value: any, document: Tyr.Document) => any;
  labelInValue?: boolean;
  linkLabels?: { $id: any; $label: string }[];
  manuallySortedLabels?: boolean;
}

export type TyrFieldExistsProps = Omit<TyrFieldProps, 'field'> & {
  field: Tyr.FieldInstance;
};

export const getFieldName = (field: string | Tyr.FieldInstance | undefined) => {
  if (typeof field === 'string') return field;
  if (field) return field.path;
  //return undefined;
};

export type TyrFieldLaxProps = Omit<TyrFieldProps, 'field' | 'searchField'> & {
  field?: Tyr.FieldInstance | string;
  searchField?: Tyr.FieldInstance | string;
};

export const labelForProps = (props: TyrTypeProps) => {
  const label = props.label;
  if (label) return label;

  const { extra } = props;
  if (extra) return Tyr.labelize(extra);

  return props.path!.tail.label;
};

export const decorateField = (
  name: string,
  props: TyrTypeProps,
  component: () => React.ReactElement
) => {
  const { path, form, extra } = props;
  const field = path && path.tail;

  const identifier = extra || path!.identifier;

  if (props.hideOnCreate && props.document && props.document.$isNew) {
    return <div className="hide-on-create" />;
  }

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
    const help = field && field.def && field.def.help;

    label = (
      <>
        {labelForProps(props)}
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
      key={extra || field!.path}
      className={className('tyr-' + name, props)}
      label={label}
    >
      {form.getFieldDecorator(identifier, {
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
  const { tail: field } = path!;
  const { type } = field;
  const typeUi = assertTypeUi(props.typeUi || type.name);
  return React.createElement(typeUi.component, props);
};

export const TyrField = withTypeContext(TyrFieldBase);
