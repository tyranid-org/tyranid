import * as React from 'react';

import { Tyr } from 'tyranid/client';

import { WrappedFormUtils } from 'antd/lib/form/Form';

import {
  Filter,
  Finder,
  Filterable,
  TyrFieldLaxProps,
  TyrFieldProps,
  TyrComponent
} from '../core';

export const className = (className: string, props: TyrTypeProps) => {
  return className + (props.className ? ' ' + props.className : '');
};

export function generateRules(props: TyrTypeProps) {
  const rules = [];
  const { path } = props;
  if (path) {
    const { tail: field } = path;
    if (props.max !== undefined) {
      rules.push({
        max: props.max,
        message: `The ${props.label || field.label} must be ${
          props.max
        } characters or less!`
      });
    }

    if (props.required || field.def.required) {
      rules.push({
        required: true,
        message: `${props.label || field.label} is required.`
      });
    }
  }

  return rules;
}

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
  aux?: string;

  children?: React.ReactNode;
} & TyrFieldLaxProps;

export type TyrTypeProps = {
  form: WrappedFormUtils;
  document?: Tyr.Document;
  component?: TyrComponent;
  value?: { value?: any };
  path?: Tyr.NamePathInstance;
  searchPath?: Tyr.NamePathInstance;
  aux?: string;
  children?: React.ReactNode;
} & Omit<TyrFieldProps, 'field'>;

export interface TypeUi {
  // standard form control
  component: React.ComponentType<TyrTypeProps>;

  // mapping between Tyr.Document and ant forms
  mapDocumentValueToFormValue?(
    path: Tyr.NamePathInstance,
    value: any,
    props?: TyrTypeProps
  ): any;
  mapFormValueToDocumentValue?(
    path: Tyr.NamePathInstance,
    value: any,
    props?: TyrTypeProps
  ): any;
  mapFormValueToDocument?(
    path: Tyr.NamePathInstance,
    value: any,
    document: Tyr.Document,
    props?: TyrTypeProps
  ): any;

  // table-related values
  filter?: Filter;
  finder?: Finder;
  cellValue?: (
    path: Tyr.NamePathInstance,
    document: Tyr.Document,
    props: TyrTypeProps
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
  value: any,
  props?: TyrTypeProps
) => {
  const { tail: field } = path;
  const { type } = field;
  const { mapDocumentValueToFormValue } = assertTypeUi(
    props ? props.typeUi || type.name : type.name
  );

  if (mapDocumentValueToFormValue) {
    value = mapDocumentValueToFormValue(path, value, props);
  }

  if (value === undefined && props) {
    const { default: defaultValue } = props;
    if (defaultValue) return defaultValue;
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

  const { document } = props;
  const path = props.path!;
  v = path.get(document!);
  if (v === undefined) {
    const dv = defaultValue || props.default;
    if (dv !== undefined) {
      v = dv;
      path.set(document!, v, { create: true });
      v = path.get(document); // doing this until we can update mobx to 5+
    }
  }

  return v;
};

export const fieldDecoratorName = (props: TyrTypeProps) => {
  // ant forms act weird when there are '.'s in the property names
  return props.path!.name.replace(/\./g, '_');
};

export const mapPropsToForm = (props: TyrTypeProps) => {
  const { path, document, form, value, default: defaultValue } = props;

  if (value !== undefined) {
    const pathid = path!.identifier;
    // TODO:  this should be [pathid] instead of .value ?
    const oldValue = form.getFieldsValue([pathid]).value;
    const newValue = value.value || defaultValue;

    if (oldValue !== newValue) {
      form.setFieldsValue({
        // TODO:  should this be "value" instead of "newValue" ?
        [pathid]: newValue
      });
    }
  } else {
    mapDocumentToForm(path!, document!, form, props);
  }
};

export const mapDocumentToForm = (
  path: Tyr.NamePathInstance,
  document: Tyr.Document,
  form: WrappedFormUtils,
  props?: TyrTypeProps
) => {
  const pathid = path.identifier;
  const oldValue = form.getFieldsValue([pathid])[pathid];
  let newValue: any;

  if (props && props.mapDocumentValueToForm) {
    newValue = props.mapDocumentValueToForm(path.get(document), document);
  } else {
    newValue = mapDocumentValueToFormValue(path, path.get(document), props);
  }

  if (oldValue !== newValue) {
    form.setFieldsValue({
      [pathid]: newValue
    });
  }
};

export const mapFormValueToDocumentValue = (
  path: Tyr.NamePathInstance,
  value: any,
  props?: TyrTypeProps
) => {
  const { tail: field } = path;
  const { type } = field;

  const { mapFormValueToDocumentValue } = assertTypeUi(type.name);

  return mapFormValueToDocumentValue
    ? mapFormValueToDocumentValue(path, value, props)
    : value;
};

export const mapFormValueToDocument = (
  path: Tyr.NamePathInstance,
  value: any,
  document: Tyr.Document,
  props?: TyrTypeProps
) => {
  const { tail: field } = path;
  const { type } = field;

  if (props && props.mapFormValueToDocument) {
    value = props.mapFormValueToDocument(value, document);
  } else {
    const typeUi = assertTypeUi(props ? props.typeUi || type.name : type.name);

    const { mapFormValueToDocument } = typeUi;
    if (mapFormValueToDocument) {
      mapFormValueToDocument(path, value, document, props);
      return;
    }

    value = mapFormValueToDocumentValue(path, value, props);
  }

  path.set(document, value, {
    create: true
  });
};

/**
 * We want to keep the document up-to-date and in-sync with the form so that
 * computed values and computed validations are always up-to-date.
 */
export const onTypeChange = (props: TyrTypeProps, value: any, event: any) => {
  const { document, onChange } = props;

  // if (event) {
  //   event.stopPropagation();
  //   event.preventDefault();
  //   return false;
  // }

  if (document) {
    if (!props.value) {
      mapFormValueToDocument(props.path!, value, document, props);
    }

    onChange && onChange(value, event, props);
  }
};

export const getFilter = (filterable: Filterable, props: TyrFieldProps) => {
  const { namePath: path } = props.field!;
  const { filter } = assertTypeUi(props.typeUi || path.tail.type.name);

  return filter ? filter(filterable, props) : undefined;
};

export const getFinder = (path: Tyr.NamePathInstance) => {
  const { finder } = assertTypeUi(path.tail.type.name);
  return finder;
};

export const getCellValue = (
  path: Tyr.NamePathInstance,
  document: Tyr.Document,
  props: TyrTypeProps
) => {
  const { tail: field } = path;

  if (props.typeUi) {
    const { cellValue } = assertTypeUi(props.typeUi);
    if (cellValue) return cellValue(path, document, props);
  }

  if (!field.type) return 'Unknown';

  const { cellValue } = assertTypeUi(field.type.name);
  return cellValue
    ? cellValue(path, document, props)
    : field.type.format(field, field.namePath.get(document));
};

export const TypeContext = React.createContext<TyrTypeProps | undefined>(
  undefined
);

export const withTypeContext = <T extends {} = {}>(
  type: string | undefined,
  TypeControl: React.ComponentType<T & TyrTypeProps>
) => (props: TyrTypeLaxProps & T) => (
  <TypeContext.Consumer>
    {parentProps => {
      const form = props.form || (parentProps && parentProps.form);
      if (!form) return <div className="no-form" />;

      const document = props.document || (parentProps && parentProps.document);
      if (!document) return <div className="no-document" />;

      const collection = document.$model;

      const { aux } = props;
      if (aux) {
        if (props.path) return <div className="both-aux-and-path-specified" />;
        if (!type) return <div className="aux-not-valid-on-TyrField" />;

        document.$model.aux({
          [aux]: { is: type }
        });
      }

      let path = Tyr.NamePath.resolve(
        collection,
        parentProps && parentProps.path,
        aux || props.path
      );
      if (!path) {
        let { field } = props;
        if (typeof field === 'string') field = document.$model.paths[field];
        if (field) {
          path = (field as Tyr.FieldInstance).namePath;
        } else {
          return <div className="no-path" />;
        }
      }

      return React.createElement(TypeControl, {
        ...props,
        form,
        document,
        path,
        component: parentProps && parentProps.component
      });
    }}
  </TypeContext.Consumer>
);
