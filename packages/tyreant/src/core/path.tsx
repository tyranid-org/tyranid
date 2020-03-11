import * as React from 'react';

import { Moment } from 'moment';

import { Tooltip, Icon } from 'antd';
import { SelectValue } from 'antd/lib/select';
import FormItem from 'antd/lib/form/FormItem';

import { Tyr } from 'tyranid/client';

import {
  assertTypeUi,
  TyrTypeProps,
  FieldState,
  generateRules,
  className
} from '../type/type';
import { useThemeProps, TyrThemeProps, withThemedTypeContext } from './theme';
import { registerComponent } from '../common';

/**
 * This determines a list of default fields to show for a collection if no fields have been specified.
 *
 * TODO:  look at / add more properties on Fields to determine more intelligently which fields to show
 *
 * TODO:  this should maybe be moved to tyranid ?
 */
export function defaultPathsProp(collection: Tyr.CollectionInstance) {
  const pathsArr = [];

  const { fields } = collection;
  for (const fieldName in fields) {
    const field = fields[fieldName];

    if (field.type.name === 'mongoid') continue;

    // TODO:  check other metadata like default fields, etc.
    pathsArr.push({ path: field.namePath });
  }

  return pathsArr;
}

export type TyrSortDirection = 'ascend' | 'descend';

export interface TyrPathProps {
  path?: Tyr.NamePathInstance;
  searchPath?: Tyr.NamePathInstance;
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
  onSelect?: (value: SelectValue, option: React.ReactElement<any>) => any;
  onDeselect?: (value: SelectValue) => any;
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
  filterValues?: {
    $id: any;
    $label: string;
  }[];
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
    | 'double'
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

export type TyrPathExistsProps = Omit<TyrPathProps, 'path'> & {
  path: Tyr.NamePathInstance;
};

export const getPathName = (
  path: string | Tyr.NamePathInstance | undefined
) => {
  if (typeof path === 'string') return path;
  if (path) return path.name;
  //return undefined;
};

export type TyrPathLaxProps = Omit<TyrPathProps, 'path' | 'searchPath'> & {
  path?: Tyr.NamePathInstance | string;
  searchPath?: Tyr.NamePathInstance | string;
};

export const labelForProps = (props: TyrTypeProps) => {
  const label = props.label;
  return label || props.path!.tail.label;
};

export const decorateField = (
  name: string,
  props: TyrTypeProps,
  component: () => React.ReactElement
) => {
  const { path, form } = props;
  const field = path?.tail;

  const identifier = path!.identifier;

  if (props.hideOnCreate && props.document?.$isNew) {
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
    const help = field?.def?.help;

    label = (
      <>
        {labelForProps(props)}
        {help && (
          <Tooltip title={help}>
            &nbsp;
            <Icon type="exclamation-circle" />
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

export const TyrThemedFieldBase = (props: TyrTypeProps) => {
  const { path } = props;
  const { tail: field } = path!;
  const { type } = field;
  const typeUi = assertTypeUi(props.typeUi || type.name);
  return React.createElement(
    typeUi.component,
    useThemeProps(type.name as keyof TyrThemeProps, props)
  );
};

export const TyrField = withThemedTypeContext(undefined, TyrFieldBase);

registerComponent('TyrField', TyrField);
