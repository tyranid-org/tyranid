import * as React from 'react';

import { Tyr } from 'tyranid/client';

import { ColumnFilterItem } from 'antd/lib/table';
import { WrappedFormUtils } from 'antd/lib/form/Form';
import { TyrFieldLaxProps, TyrFieldExistsProps, TyrFieldProps } from '../core';

export const className = (className: string, props: TyrTypeProps) => {
  return className + (props.className ? ' ' + props.className : '');
};

export function generateRules(props: TyrTypeProps) {
  const rules = [];
  const { path } = props;
  const { detail: field } = path;
  if (field.def.required) {
    rules.push({
      required: true,
      message: `${field.label} is required.`
    });
  }

  return rules;
}

export interface Filterable {
  searchValues: { [pathName: string]: any };
  onSearch(): void;

  // TODO: when we upgrade to latest ant, that Table control takes a component, not a react node, so we can
  //       update via state/props/etc. instead of this callback
  onFilterChange(): void;
}

export type Filter = (
  path: Tyr.NamePathInstance,
  filterable: Filterable
) => {
  filterDropdown?: React.ReactNode;
  filterIcon?: React.ReactNode;
  onFilter?: (value: any, doc: Tyr.Document) => boolean;
  onFilterDropdownVisibleChange?: (visible: boolean) => void;
  filters?: ColumnFilterItem[];
};

export type Finder = (
  path: Tyr.NamePathInstance,
  opts: any /* TODO: add Tyr.Options_Find to client */,
  searchValue: any
) => void;

export interface FieldState {
  ready?: boolean;
}

export type TyrTypeLaxProps = {
  form?: WrappedFormUtils;
  document?: Tyr.Document;
  value?: { value?: any };

  /**
   * if path does not exist, we will use field.path
   */
  path?: string | Tyr.NamePathInstance;
} & TyrFieldLaxProps;

export type TyrTypeProps = {
  form: WrappedFormUtils;
  document?: Tyr.Document;
  value?: { value?: any };
  path: Tyr.NamePathInstance;
} & Omit<TyrFieldProps, 'field'>;

export interface TypeUi {
  // standard form control
  component: React.ComponentType<TyrTypeProps>;

  // mapping between Tyr.Document and ant forms
  mapDocumentValueToFormValue?(path: Tyr.NamePathInstance, value: any): any;
  mapFormValueToDocumentValue?(path: Tyr.NamePathInstance, value: any): any;

  // table-related values
  filter?: Filter;
  finder?: Finder;
  cellValue?: (
    path: Tyr.NamePathInstance,
    document: Tyr.Document
  ) => React.ReactNode;
}

export const byName: { [typeName: string]: TypeUi } = {};

export const assertTypeUi = (typeName: string) => {
  const typeUi = byName[typeName];

  if (!typeUi)
    throw new Error(`No tyreant type registered for type "${typeName}"`);

  return typeUi;
};

export const mapDocumentValueToFormValue = (
  path: Tyr.NamePathInstance,
  value: any
) => {
  const { detail: field } = path;
  const { type } = field;
  const { mapDocumentValueToFormValue } = assertTypeUi(type.name);
  if (mapDocumentValueToFormValue) {
    value = mapDocumentValueToFormValue(path, value);
  }

  return value;
};

export const getTypeValue = (props: TyrTypeProps, defaultValue: any) => {
  const { value } = props;
  let v: any;

  if (value) {
    v = value.value;
    if (!v && defaultValue !== undefined) {
      v = value.value = defaultValue;
    }

    return v;
  }

  const { path, document } = props;
  v = path.get(document);
  if (!v && defaultValue !== null) {
    v = defaultValue;
    path.set(document, v);
  }

  return v;
};

export const mapPropsToForm = (props: TyrTypeProps) => {
  const { path, document, form, value } = props;

  if (value !== undefined) {
    const oldValue = form.getFieldsValue(['value'])['value'];
    const newValue = value.value;

    if (oldValue !== newValue) {
      form.setFieldsValue({
        ['value']: newValue
      });
    }
  } else {
    mapDocumentToForm(path, document!, form);
  }
};

export const mapDocumentToForm = (
  path: Tyr.NamePathInstance,
  document: Tyr.Document,
  form: WrappedFormUtils
) => {
  const { detail: field } = path;

  const oldValue = form.getFieldsValue([path.name])[path.name];

  const newValue = mapDocumentValueToFormValue(path, path.get(document));

  console.log('oldValue', oldValue, 'newValue', newValue);

  if (oldValue !== newValue) {
    form.setFieldsValue({
      [path.name]: newValue
    });
  }
};

export const mapFormValueToDocumentValue = (
  path: Tyr.NamePathInstance,
  value: any
) => {
  const { detail: field } = path;
  const { type } = field;
  const { mapFormValueToDocumentValue } = assertTypeUi(type.name);

  return mapFormValueToDocumentValue
    ? mapFormValueToDocumentValue(path, value)
    : value;
};

export const mapFormValueToDocument = (
  path: Tyr.NamePathInstance,
  value: any,
  document: Tyr.Document
) => {
  path.set(document, mapFormValueToDocumentValue(path, value));
};

export const getFilter = (
  path: Tyr.NamePathInstance,
  filterable: Filterable
) => {
  const { filter } = assertTypeUi(path.detail.type.name);

  return filter ? filter(path, filterable) : undefined;
};

export const getFinder = (path: Tyr.NamePathInstance) => {
  const { finder } = assertTypeUi(path.detail.type.name);
  return finder;
};

export const getCellValue = (
  path: Tyr.NamePathInstance,
  document: Tyr.Document
) => {
  const { detail: field } = path;
  const { cellValue } = assertTypeUi(field.type.name);
  return cellValue
    ? cellValue(path, document)
    : field.type.format(field, field.namePath.get(document));
};

export const TypeContext = React.createContext<TyrTypeProps | undefined>(
  undefined
);

export const withTypeContext = (
  FormControl: React.ComponentType<TyrTypeProps>
) => (props: TyrTypeLaxProps) => (
  <TypeContext.Consumer>
    {formProps => {
      const form = props.form || (formProps && formProps.form);
      if (!form) throw new Error('tyr form control not given a form');

      const document = props.document || (formProps && formProps.document);
      if (!document) throw new Error('tyr form control not given a document');

      const { field: rawField } = props;
      if (!rawField) throw new Error('tyr form control not given a field');

      let field: Tyr.FieldInstance;

      if (typeof rawField === 'string') {
        const fieldName = rawField;
        field = document.$model.paths[fieldName];
        if (!field)
          throw new Error(
            `cannot find "${fieldName}" on "${document.$model.name}"`
          );
      } else {
        field = rawField;
      }

      const { collection } = field;

      const rawPath = props.path;
      let path: Tyr.NamePathInstance;
      if (typeof rawPath === 'string') {
        path = collection.parsePath(rawPath);
      } else if (rawPath) {
        path = rawPath;
      } else {
        path = (field as Tyr.FieldInstance).namePath;
      }

      return React.createElement(FormControl, {
        ...props,
        form,
        document,
        path
      });
    }}
  </TypeContext.Consumer>
);
