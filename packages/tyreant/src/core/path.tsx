import * as React from 'react';

import { Moment } from 'moment';

import { ExclamationCircleOutlined } from '@ant-design/icons';

import { Form, Tooltip } from 'antd';
import { SelectValue } from 'antd/lib/select';

import { Tyr } from 'tyranid/client';

import {
  assertTypeUi,
  TyrTypeProps,
  FieldState,
  generateRules,
  className,
  getCellValue,
} from '../type/type';
import { useThemeProps, TyrThemeProps, withThemedTypeContext } from './theme';
import { registerComponent } from '../common';
import { FormItemProps } from 'antd/lib/form';
import { TyrSortDirection } from './typedef';
import { stringWidth, wrappedStringWidth } from '../util/font';
import { responsiveMap } from 'antd/lib/_util/responsiveObserve';

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

  as?:
    | 'radio' // links
    | 'switch'; // booleans
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

  // FORM ITEMS
  autoFocus?: boolean;
  editClassName?: string;
  /**
   * Do not show this field when creating new documents.
   */
  hideOnCreate?: boolean;
  isEditable?: (document: Tyr.Document) => boolean;
  mapDocumentValueToForm?: (value: any, document: Tyr.Document) => any;
  mapFormValueToDocument?: (value: any, document: Tyr.Document) => any;
  mode?: 'view' | 'edit' | 'search';
  /**
   * Suppress the default generation of field labels.
   */
  noLabel?: boolean;
  onChange?: (value: any, event: any, props: TyrTypeProps<D>) => void;
  readonly?: boolean;
  tabIndex?: number;
  validateTrigger?: string | string[] | false;

  // VALIDATION
  required?: boolean;
  requiredMessage?: string;

  max?: number;
  maxMessage?: string;

  minimum?: number;
  maximum?: number;
  validator?: (
    rule: any,
    value: any,
    callback: (error?: string) => void
  ) => Promise<void> | void;

  // DATE / DATETIME
  dateFormat?: string | string[];

  // NUMBERS / DATES
  searchRange?: [number, number] | [Moment, Moment];

  /**
   * This indicates that the following render function should be used to render values.  If render is specified
   * then field is not required/needed.
   */
  renderField?: (doc: D, options?: Tyr.Document[]) => React.ReactElement;
  renderDisplay?: (doc: D) => React.ReactElement | string;

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
    doc: Tyr.Document
  ) =>
    | { $id: any; $label: string }
    | { $id: any; $label: string }[]
    | undefined;
  filterOptionRenderer?: (value: any) => React.ReactElement;
  getSearchIds?: (val: any) => any[];
  labelInValue?: boolean;
  linkLabels?: { $id: any; $label: string }[];
  manuallySortedLabels?: boolean;
  multiple?: boolean;
  onDeselect?: (value: SelectValue) => any;
  onSelect?: (value: SelectValue, option: any) => any;
  onStateChange?: (value: FieldState) => void;
  optionFilter?: (documents: Tyr.Document[]) => Tyr.Document[];
  searchOptionRenderer?: (optionDocument: Tyr.Document) => React.ReactElement;
  searchPath?: Tyr.PathInstance;
  searchSortById?: boolean;

  // STRING (incl EMAIL, PASSWORD, etc.)
  onPressEnter?: () => void;

  // TEXT
  textAreaRows?: number;

  // DATE, DATETIME, LINK
  /**
   * Whether to show the clear button.
   */
  allowClear?: boolean;

  // MANY-COMPONENT
  liveSearch?: boolean;

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
  columnClassName?: (doc: Tyr.Document) => string | undefined;

  // SORT
  defaultSort?: TyrSortDirection;
  sortComparator?: (a: Tyr.Document, b: Tyr.Document) => number;

  // FILTER
  defaultFilter?: Object;
  noFilter?: boolean;
  onFilter?: (value: any, doc: Tyr.Document) => boolean;
}

export type TyrPathExistsProps<D extends Tyr.Document> = Omit<
  TyrPathProps<D>,
  'path'
> & {
  path: Tyr.PathInstance;
};

export const getPathName = (
  path: string | Tyr.PathInstance | TyrPathProps<any> | undefined
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

export const labelForProps = (props: TyrTypeProps<any>) => {
  const label = props.label;
  return label || props.path!.pathLabel;
};

export const getValue = (props: TyrTypeProps<any>) => {
  const { path, document, value } = props;
  return value ? value.value : path!.get(document);
};

export const decorateField = (
  name: string,
  props: TyrTypeProps<any>,
  component: () => React.ReactElement
) => {
  const {
    path,
    document,
    labelCol,
    wrapperCol,
    labelAlign,
    help,
    htmlFor,
    hasFeedback,
    colon,
    noStyle,
    dependencies,
    validateTrigger,
  } = props;
  const field = path?.tail;

  if (props.hideOnCreate && document?.$isNew) {
    return <div className="hide-on-create" />;
  }

  let label;
  if (!props.noLabel) {
    const help = field?.def?.help;

    label = (
      <>
        {labelForProps(props)}
        {help && (
          <Tooltip title={help}>
            &nbsp;
            <ExclamationCircleOutlined />
          </Tooltip>
        )}
      </>
    );
  }

  const readonly = props.readonly;

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
      className={className('tyr-' + name, props)}
      label={label}
      rules={generateRules(props)}
      // see https://github.com/ant-design/ant-design/issues/20803
      {...(name === 'boolean' && { valuePropName: 'checked' })}
    >
      {props.renderField && document ? (
        props.renderField(document)
      ) : readonly ? (
        <span>{getCellValue(path!, document!, props)}</span>
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
