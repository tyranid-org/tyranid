import * as React from 'react';

import { Tyr } from 'tyranid/client';

import { ColumnFilterItem } from 'antd/lib/table';
import { WrappedFormUtils } from 'antd/lib/form/Form';
import { TyrFieldLaxProps, TyrFieldProps } from '../core';

export const className = (className: string, props: TyrTypeProps) => {
  return className + (props.className ? ' ' + props.className : '');
};

export function generateRules(props: TyrTypeProps) {
  const rules = [];
  const { path } = props;
  const { tail: field } = path;
  if (props.required || field.def.required) {
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
  localSearch: boolean;
}

export type Filter = (
  path: Tyr.NamePathInstance,
  filterable: Filterable,
  props: TyrFieldLaxProps
) => {
  filterDropdown?: React.ReactNode;
  filterIcon?: React.ReactNode;
  onFilter?: (value: any, doc: Tyr.Document) => boolean;
  onFilterDropdownVisibleChange?: (visible: boolean) => void;
  filterDropdownVisible?: boolean
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
  children?: React.ReactNode;
} & TyrFieldLaxProps;

export type TyrTypeProps = {
  form: WrappedFormUtils;
  document?: Tyr.Document;
  value?: { value?: any };
  path: Tyr.NamePathInstance;
  children?: React.ReactNode;
} & Omit<TyrFieldProps, 'field'>;

export interface TypeUi {
  // standard form control
  component: React.ComponentType<TyrTypeProps>;

  // mapping between Tyr.Document and ant forms
  mapDocumentValueToFormValue?(path: Tyr.NamePathInstance, value: any): any;
  mapFormValueToDocumentValue?(path: Tyr.NamePathInstance, value: any): any;
  mapFormValueToDocument?(
    path: Tyr.NamePathInstance,
    value: any,
    document: Tyr.Document
  ): any;

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
  const { tail: field } = path;
  const { type } = field;
  const { mapDocumentValueToFormValue } = assertTypeUi(type.name);
  if (mapDocumentValueToFormValue) {
    value = mapDocumentValueToFormValue(path, value);
  }

  return value;
};

export const getTypeValue = (props: TyrTypeProps, defaultValue?: any) => {
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
  v = path.get(document!);
  if (!v && defaultValue !== undefined) {
    v = defaultValue;
    path.set(document!, v);
    v = path.get(document); // doing this until we can update mobx to 5+
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
  const oldValue = form.getFieldsValue([path.name])[path.name];

  const newValue = mapDocumentValueToFormValue(path, path.get(document));

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
  const { tail: field } = path;
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
  const { tail: field } = path;
  const { type } = field;
  const typeUi = assertTypeUi(type.name);

  const { mapFormValueToDocument } = typeUi;
  if (mapFormValueToDocument) {
    mapFormValueToDocument(path, value, document);
    return;
  }

  path.set(document, mapFormValueToDocumentValue(path, value));
};

export const getFilter = (
  path: Tyr.NamePathInstance,
  filterable: Filterable,
  props: TyrFieldLaxProps
) => {
  const { filter } = assertTypeUi(path.tail.type.name);

  return filter ? filter(path, filterable, props) : undefined;
};

export const getFinder = (path: Tyr.NamePathInstance) => {
  const { finder } = assertTypeUi(path.tail.type.name);
  return finder;
};

export const getCellValue = (
  path: Tyr.NamePathInstance,
  document: Tyr.Document
) => {
  const { tail: field } = path;
  const { cellValue } = assertTypeUi(field.type.name);
  return cellValue
    ? cellValue(path, document)
    : field.type.format(field, field.namePath.get(document));
};

export const TypeContext = React.createContext<TyrTypeProps | undefined>(
  undefined
);

export const withTypeContext = <T extends {} = {}>(
  TypeControl: React.ComponentType<T & TyrTypeProps>
) => (props: TyrTypeLaxProps & T) => (
  <TypeContext.Consumer>
    {parentProps => {
      const form = props.form || (parentProps && parentProps.form);
      if (!form) return <div className="no-form" />;

      const document = props.document || (parentProps && parentProps.document);
      if (!document) return <div className="no-document" />;

      const collection = document.$model;

      const path = Tyr.NamePath.resolve(
        collection,
        parentProps && parentProps.path,
        props.path
      );
      if (!path) return <div className="no-path" />;

      return React.createElement(TypeControl, {
        ...props,
        form,
        document,
        path
      });
    }}
  </TypeContext.Consumer>
);
