import * as React from 'react';

import { Tyr } from 'tyranid/client';

import { ColumnFilterItem } from 'antd/lib/table';
import { WrappedFormUtils } from 'antd/lib/form/Form';
import { SelectedValue } from 'antd/lib/select';

export const className = (className: string, props: TyrTypeProps) =>
  className + (props.className ? ' ' + props.className : '');

export function generateRules(field: Tyr.FieldInstance) {
  const rules = [];
  if (field.def.required) {
    rules.push({
      required: true,
      message: `${field.label} is required.`
    });
  }

  return rules;
}

export interface Filterable {
  searchValues: { [pathName: string]: Tyr.anny };
  onSearch(): void;

  // TODO: when we upgrade to latest ant, that Table control takes a component, not a react node, so we can
  //       update via state/props/etc. instead of this callback
  onFilterChange(): void;
}

export type Filter = (
  field: Tyr.FieldInstance,
  filterable: Filterable
) => {
  filterDropdown?: React.ReactNode;
  filterIcon?: React.ReactNode;
  onFilter?: (value: Tyr.anny, doc: Tyr.Document) => boolean;
  onFilterDropdownVisibleChange?: (visible: boolean) => void;
  filters?: ColumnFilterItem[];
};

export type Finder = (
  field: Tyr.FieldInstance,
  opts: Tyr.anny /* TODO: add Tyr.Options_Find to client */,
  searchValue: Tyr.anny
) => void;

export type TyrTypeLaxProps = Readonly<{
  form?: WrappedFormUtils;
  document?: Tyr.Document;
  field: Tyr.FieldInstance | string;
  className?: string;
  placeholder?: string;
  mode?: 'view' | 'edit' | 'search';
  multiple?: boolean;
  onSelect?: (
    value: SelectedValue,
    option: React.ReactElement<any>
  ) => Tyr.anny;
  onDeselect?: (value: SelectedValue) => Tyr.anny;
}>;

export type TyrTypeProps = Readonly<{
  form: WrappedFormUtils;
  document: Tyr.Document;
  field: Tyr.FieldInstance;
  className?: string;
  placeholder?: string;
  mode?: 'view' | 'edit' | 'search';
  multiple?: boolean;
  onSelect?: (
    value: SelectedValue,
    option: React.ReactElement<any>
  ) => Tyr.anny;
  onDeselect?: (value: SelectedValue) => Tyr.anny;
}>;

export interface TypeUi {
  // standard form control
  component: React.ComponentType<TyrTypeProps>;

  // mapping between Tyr.Document and ant forms
  mapDocumentValueToFormValue?(
    field: Tyr.FieldInstance,
    value: Tyr.anny
  ): Tyr.anny;
  mapFormValueToDocumentValue?(
    field: Tyr.FieldInstance,
    value: Tyr.anny
  ): Tyr.anny;

  // table-related values
  filter?: Filter;
  finder?: Finder;
  cellValue?: (
    field: Tyr.FieldInstance,
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
  field: Tyr.FieldInstance,
  value: Tyr.anny
) => {
  const { type } = field;
  const { mapDocumentValueToFormValue } = assertTypeUi(type.name);
  if (mapDocumentValueToFormValue) {
    value = mapDocumentValueToFormValue(field, value);
  }

  return value;
};

export const mapDocumentToForm = (
  field: Tyr.FieldInstance,
  document: Tyr.Document,
  form: WrappedFormUtils
) => {
  form.setFieldsValue({
    [field.path]: mapDocumentValueToFormValue(
      field,
      field.namePath.get(document)
    )
  });
};

export const mapFormValueToDocumentValue = (
  field: Tyr.FieldInstance,
  value: Tyr.anny
) => {
  const { type } = field;
  const { mapFormValueToDocumentValue } = assertTypeUi(type.name);

  return mapFormValueToDocumentValue
    ? mapFormValueToDocumentValue(field, value)
    : value;
};

export const mapFormValueToDocument = (
  field: Tyr.FieldInstance,
  value: Tyr.anny,
  document: Tyr.Document
) => {
  field.namePath.set(document, mapFormValueToDocumentValue(field, value));
};

export const getFilter = (field: Tyr.FieldInstance, filterable: Filterable) => {
  const { filter } = assertTypeUi(field.type.name);

  return filter ? filter(field, filterable) : undefined;
};

export const getFinder = (field: Tyr.FieldInstance) => {
  const { finder } = assertTypeUi(field.type.name);
  return finder;
};

export const getCellValue = (
  field: Tyr.FieldInstance,
  document: Tyr.Document
) => {
  const { cellValue } = assertTypeUi(field.type.name);
  return cellValue
    ? cellValue(field, document)
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
      if (!form) throw 'tyr form control not given a form';

      const document = props.document || (formProps && formProps.document);
      if (!document) throw 'tyr form control not given a document';

      let field = props.field;
      if (!field) throw 'tyr form control not given a field';

      if (typeof field === 'string') {
        const fieldName = field;
        field = document.$model.paths[fieldName];
        if (!field)
          throw `cannot find "${fieldName}" on "${document.$model.name}"`;
      }

      return React.createElement(FormControl, {
        ...props,
        form,
        document,
        field: field as Tyr.FieldInstance
      });
    }}
  </TypeContext.Consumer>
);
