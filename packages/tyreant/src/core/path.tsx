import * as React from 'react';

import { Moment } from 'moment';

import { Form } from 'antd';
import { SelectValue } from 'antd/lib/select';

import { Tyr } from 'tyranid/client';

import {
  assertTypeUi,
  TyrTypeProps,
  FieldState,
  generateRules,
  className,
  getCellValue,
  modeFor,
} from '../type/type';
import { useThemeProps, TyrThemeProps, withThemedTypeContext } from './theme';
import { registerComponent } from '../common';
import { FormItemProps } from 'antd/lib/form';
import { TyrSortDirection } from './typedef';
import { stringWidth, wrappedStringWidth } from '../util/font';
import { renderFieldLabel } from './label';

const FormItem = Form.Item;

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
    pathsArr.push({ path: field.path });
  }

  return pathsArr;
}

export interface TyrPathProps<D extends Tyr.Document>
  extends Pick<
    FormItemProps,
    | 'labelCol'
    | 'wrapperCol'
    | 'labelAlign'
    | 'colon'
    | 'help'
    | 'hasFeedback'
    | 'htmlFor'
    | 'noStyle'
    | 'dependencies'
  > {
  path?: Tyr.PathInstance;
  paths?: TyrPathExistsProps<D>[];

  theme?: TyrThemeProps;

  as?:
    | 'radio' // links
    | 'switch' // booleans
    | 'textarea'; // text
  default?: any;
  label?: string | React.ReactNode;
  className?: string;
  placeholder?: string;
  typeUi?:
    | 'link'
    | 'string'
    | 'password'
    | 'integer'
    | 'double'
    | 'boolean'
    | 'date'
    | 'datetime'
    | 'email'
    | undefined;
  translateForWhiteLabel?: (label: string) => string;

  // FORM ITEMS
  autoFocus?: boolean;
  editClassName?: string;
  /**
   * Do not show this field when creating new documents.
   */
  hideOnCreate?: boolean;
  isEditable?: (document: D) => boolean;
  mapDocumentValueToForm?: (value: any, document: D) => any;
  mapFormValueToDocument?: (value: any, document: D) => any;
  mode?: 'view' | 'edit' | 'search';
  /**
   * Suppress the default generation of field labels.
   */
  noLabel?: boolean;
  onChange?: (value: any, event: any, props: TyrTypeProps<D>) => void;
  tabIndex?: number;
  validateTrigger?: string | string[] | false;

  // VALIDATION
  required?: boolean;
  requiredMessage?: string;

  min?: number;
  max?: number;
  maxMessage?: string;

  validator?: (
    rule: any,
    value: any,
    callback: (error?: string) => void
  ) => Promise<void> | void;

  // DATE / DATETIME
  dateFormat?: string | string[];

  // NUMBERS / DATES
  searchRange?: [number, number] | [Moment, Moment];
  formatter?: (value: number) => string;

  /**
   * This indicates that the following render function should be used to render values.  If render is specified
   * then field is not required/needed.
   */
  renderField?: (
    doc: D,
    path: Tyr.PathInstance | undefined,
    props: TyrPathProps<D>
  ) => React.ReactElement;
  renderDisplay?: (
    doc: D,
    path: Tyr.PathInstance | undefined,
    props: TyrPathProps<D>
  ) => React.ReactElement | string;

  // ARRAY fixed array display format
  fixedField?: string;

  // ARRAY key-value display format
  keyField?: string;
  keyFieldClass?: string;
  keyFieldDefault?: string; // the default value to set the key field control to (label)
  valueField?: string;

  // BOOLEAN
  filterValues?: {
    $id: any;
    $label: string;
  }[];

  // LINK
  dropdownClassName?: string;
  filterOptionLabel?: (
    doc: D
  ) =>
    | Tyr.Document
    | { $id: any; $label: string }
    | { $id: any; $label: string }[]
    | undefined;
  filterOptionRenderer?: (value: D) => React.ReactElement;
  getSearchIds?: (val: any) => any[];
  labelInValue?: boolean;
  linkLabels?: { $id: any; $label: string }[];
  manuallySortedLabels?: boolean;
  multiple?: boolean;
  onDeselect?: (value: SelectValue) => any;
  onSelect?: (value: SelectValue, option: any) => any;
  onStateChange?: (value: FieldState) => void;
  optionFilter?: (documents: D[]) => Tyr.Document[];
  searchPath?: Tyr.PathInstance;
  searchSortById?: boolean;
  static?: boolean;

  // STRING (incl EMAIL, PASSWORD, etc.)
  onPressEnter?: () => void;

  // TEXT
  textAreaRows?: number;

  // DATE, DATETIME, LINK
  /**
   * Whether to show the clear button.
   */
  allowClear?: boolean;

  // SORT
  defaultSort?: TyrSortDirection;
  sortComparator?: (a: D, b: D) => number;

  // FILTER
  defaultFilter?: Object;
  noFilter?: boolean;
  onFilter?: (value: any, doc: D) => boolean;

  // TABLE
  align?: 'left' | 'right' | 'center';
  defaultHidden?: boolean;
  ellipsis?: boolean;
  /**
   * What table column grouping should this be grouped under.
   */
  childPaths?: TyrPathProps<D>[];
  group?: string;
  pinned?: 'left' | 'right';
  width?: number | string;
  columnClassName?: (doc: D) => string | undefined;
}

export type TyrPathExistsProps<D extends Tyr.Document> = Omit<
  TyrPathProps<D>,
  'path'
> & {
  path: Tyr.PathInstance;
};

export const getPathName = (
  path:
    | string
    | Tyr.PathInstance
    | TyrPathProps<any>
    | TyrPathLaxProps<any>
    | undefined
): string | undefined => {
  if (typeof path === 'string') return path;
  if (path instanceof Tyr.Path) return path.name;
  if (path) {
    const p = path.path;
    if (p) return getPathName(p);
  }
  //return undefined;
};

export type TyrPathLaxProps<D extends Tyr.Document> = Omit<
  TyrPathProps<D>,
  'path' | 'searchPath'
> & {
  path?: Tyr.PathInstance | string;
  searchPath?: Tyr.PathInstance | string;
};

export function pathTitle(pathProps: TyrPathProps<any>) {
  return pathProps.label || pathProps.path?.pathLabel || '';
}

export function pathWidth(pathProps: TyrPathProps<any>, wrapTitle?: boolean) {
  let width = pathProps.width;

  if (width) return width;

  const { path } = pathProps;
  if (path) width = path.tail.width || path.detail.width;

  const pt = pathTitle(pathProps);
  if (typeof pt === 'string') {
    const titleWidth =
      (wrapTitle ? wrappedStringWidth(pt, 15) : stringWidth(pt, 15)) +
      64; /* padding + sort/filter icon */
    return width === undefined || titleWidth > width ? titleWidth : width;
  } else {
    return width;
  }
}

export const getValue = (props: TyrTypeProps<any>, doc?: Tyr.Document<any>) => {
  const { path, document, value } = props;
  return (value ? value.value : path!.get(document || doc)) || undefined; // convert null to undefined
};

export const decorateField = (
  typeName: string,
  props: TyrTypeProps<any>,
  component: () => React.ReactElement
) => {
  const {
    colon,
    document,
    labelCol,
    wrapperCol,
    labelAlign,
    help,
    htmlFor,
    hasFeedback,
    path,
    noStyle,
    dependencies,
    validateTrigger,
  } = props;

  const mode = modeFor(props);

  if (props.hideOnCreate && document?.$isNew)
    return <div className="hide-on-create" />;

  if (mode === 'view') {
    const v = getValue(props);

    if (v === undefined || (Array.isArray(v) && !v.length))
      return <div className="hide-on-undefined" />;
  }

  return (
    <FormItem
      key={path!.name}
      {...(labelCol && { labelCol })}
      {...(wrapperCol && { wrapperCol })}
      {...(labelAlign && { labelAlign })}
      {...(help && { help })}
      {...(htmlFor && { htmlFor })}
      {...(colon !== undefined && { colon })}
      {...(hasFeedback !== undefined && { hasFeedback })}
      {...(noStyle && { noStyle })}
      {...(dependencies && { dependencies })}
      {...(validateTrigger !== undefined && { validateTrigger })}
      name={path!.identifier}
      className={className('tyr-' + typeName, props)}
      label={props.noLabel ? undefined : renderFieldLabel(props)}
      rules={generateRules(props)}
      // see https://github.com/ant-design/ant-design/issues/20803
      {...(typeName === 'boolean' && { valuePropName: 'checked' })}
    >
      {props.renderField && document ? (
        props.renderField(document, path, props)
      ) : mode === 'view' ? (
        <span>{getCellValue(path!, document!, props, typeName)}</span>
      ) : (
        component()
      )}
    </FormItem>
  );
};

export const TyrFieldBase = <D extends Tyr.Document = Tyr.Document>(
  props: TyrTypeProps<D>
) => {
  const { path } = props;
  const { tail: field } = path!;
  const { type } = field;
  const typeUi = assertTypeUi(props.typeUi || type.name);
  return React.createElement(typeUi.component, props);
};

export const TyrThemedFieldBase = <D extends Tyr.Document = Tyr.Document>(
  props: TyrTypeProps<D>
) => {
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
