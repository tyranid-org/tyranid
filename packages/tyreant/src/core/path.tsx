import * as React from 'react';

import { Moment } from 'moment';

import { ExclamationCircleOutlined } from '@ant-design/icons';

import { Form, Tooltip, Typography } from 'antd';
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

export interface TyrPathProps
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
  searchPath?: Tyr.PathInstance;
  getSearchIds?: (val: any) => any[];

  label?: string | React.ReactNode;
  className?: string;
  placeholder?: string;
  dateFormat?: string | string[];
  default?: any;
  mode?: 'view' | 'edit' | 'search';
  multiple?: boolean;
  group?: string;

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
  defaultFilter?: Object;
  dropdownClassName?: string;
  width?: number | string;

  onChange?: (value: any, event: any, props: TyrTypeProps) => void;
  onStateChange?: (value: FieldState) => void;

  onSelect?: (value: SelectValue, option: any) => any;
  onDeselect?: (value: SelectValue) => any;

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
    | 'password'
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
  minimum?: number;
  maximum?: number;
  validator?: (
    rule: any,
    value: any,
    callback: (error?: string) => void
  ) => Promise<void> | void;
  asSwitch?: boolean;
  allowClear?: boolean;
  maxMessage?: string;
  requiredMessage?: string;
  validateTrigger?: string | string[] | false;
  textAreaRows?: number;
  onPressEnter?: () => void;
  optionFilter?: (documents: Tyr.Document[]) => Tyr.Document[];
}

export type TyrPathExistsProps = Omit<TyrPathProps, 'path'> & {
  path: Tyr.PathInstance;
};

export const getPathName = (
  path: string | Tyr.PathInstance | TyrPathProps | undefined
): string | undefined => {
  if (typeof path === 'string') return path;
  if (path instanceof Tyr.Path) return path.name;
  if (path) {
    const p = path.path;
    if (p) return getPathName(p);
  }
  //return undefined;
};

export type TyrPathLaxProps = Omit<TyrPathProps, 'path' | 'searchPath'> & {
  path?: Tyr.PathInstance | string;
  searchPath?: Tyr.PathInstance | string;
};

export function pathTitle(pathProps: TyrPathProps) {
  return pathProps.label || pathProps.path?.pathLabel || '';
}

export function pathWidth(pathProps: TyrPathProps, wrapTitle?: boolean) {
  let width = pathProps.width;

  if (width) return width;

  const { path } = pathProps;
  if (path) width = path.tail.width || path.detail.width;

  const pt = pathTitle(pathProps);
  if (typeof pt === 'string') {
    const titleWidth =
        (wrapTitle ? wrappedStringWidth(pt, 15) : stringWidth(pt, 15)) +
        64 /* padding + sort/filter icon */;
    return width === undefined || titleWidth > width ? titleWidth : width;
  } else {
    return width;
  }
}

export const labelForProps = (props: TyrTypeProps) => {
  const label = props.label;
  return label || props.path!.pathLabel;
};

export const decorateField = (
  name: string,
  props: TyrTypeProps,
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
