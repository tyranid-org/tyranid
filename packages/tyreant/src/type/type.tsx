import * as React from 'react';

import { Rule, FormInstance } from 'antd/lib/form';

import { Tyr } from 'tyranid/client';

import {
  Filter,
  Finder,
  TyrPathLaxProps,
  TyrPathProps,
  TyrComponent,
  TyrThemeProps,
} from '../core';

export const className = (className: string, props: TyrTypeProps<any>) => {
  return className + (props.className ? ' ' + props.className : '');
};

export function generateRules(props: TyrTypeProps<any>): Rule[] {
  const rules: Rule[] = [];
  const { path } = props;

  if (path) {
    const {
      label,
      required,
      requiredMessage,
      max,
      maxMessage,
      validator,
    } = props;

    const { tail: field } = path;
    if (max !== undefined) {
      rules.push({
        max,
        message:
          maxMessage ||
          `The ${label || field.label} must be ${max} characters or less.`,
      });
    }

    if (required || field.def.required) {
      rules.push({
        required: true,
        message: requiredMessage || `${label || field.label} is required.`,
      });
    }

    if (validator) {
      const rule: Rule = {
        validator,
      };

      rules.push(rule);
    }

    if (field.def.validate) {
      const rule: Rule = {
        validator: async (rule, value, callback) => {
          const msg = field.validate(props.document!, {
            trait: props.component!.parentAction?.traits[0],
          });
          if (typeof msg === 'string') callback(msg);
        },
      };

      rules.push(rule);
    }
  }

  return rules;
}

export interface FieldState {
  ready?: boolean;
}

export type TyrTypeLaxProps<D extends Tyr.Document> = {
  form?: FormInstance;
  document?: Tyr.Document;
  component?: TyrComponent;
  value?: { value?: any };
  aux?: string;
  children?: React.ReactNode;
} & TyrPathLaxProps<D>;

export type TyrTypeProps<D extends Tyr.Document> = {
  theme?: TyrThemeProps;
  form: FormInstance;
  document?: D;
  component?: TyrComponent;
  value?: { value?: any };
  aux?: string;
  children?: React.ReactNode;
} & TyrPathProps<D>;

export interface TypeUi {
  extends?: string; // typeName

  // standard form control
  component: React.ComponentType<TyrTypeProps<any>>;

  // mapping between Tyr.Document and ant forms
  mapDocumentValueToFormValue?(
    path: Tyr.PathInstance,
    value: any,
    props?: TyrTypeProps<any>
  ): any;
  mapFormValueToDocumentValue?(
    path: Tyr.PathInstance,
    value: any,
    props?: TyrTypeProps<any>
  ): any;
  mapFormValueToDocument?(
    path: Tyr.PathInstance,
    value: any,
    document: Tyr.Document,
    props?: TyrTypeProps<any>
  ): any;

  // table-related values
  filter?: Filter;
  finder?: Finder;
  cellValue?: (
    path: Tyr.PathInstance,
    document: Tyr.Document,
    props: TyrTypeProps<any>
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
  path: Tyr.PathInstance,
  value: any,
  props?: TyrTypeProps<any>
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

export const getTypeValue = (props: TyrTypeProps<any>, defaultValue?: any) => {
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

export const fieldDecoratorName = (props: TyrTypeProps<any>) => {
  // ant forms act weird when there are '.'s in the property names
  return props.path!.name.replace(/\./g, '_');
};

export const mapPropsToForm = (props: TyrTypeProps<any>) => {
  const { path, document, form, value, default: defaultValue } = props;

  if (value !== undefined) {
    const pathid = path!.identifier;
    // TODO:  this should be [pathid] instead of .value ?
    const oldValue = form.getFieldsValue([pathid]).value;
    const newValue = value.value || defaultValue;

    if (oldValue !== newValue) {
      form.setFieldsValue({
        // TODO:  should this be "value" instead of "newValue" ?
        [pathid]: newValue,
      });
    }
  } else {
    mapDocumentToForm(path!, document!, form, props);
  }
};

export const mapDocumentToForm = (
  path: Tyr.PathInstance,
  document: Tyr.Document,
  form: FormInstance,
  props?: TyrTypeProps<any>
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
      [pathid]: newValue,
    });
  }
};

export const mapFormValueToDocumentValue = (
  path: Tyr.PathInstance,
  value: any,
  props?: TyrTypeProps<any>
) => {
  const { tail: field } = path;
  const { type } = field;

  const { mapFormValueToDocumentValue } = assertTypeUi(type.name);

  return mapFormValueToDocumentValue
    ? mapFormValueToDocumentValue(path, value, props)
    : value;
};

export const mapFormValueToDocument = (
  path: Tyr.PathInstance,
  value: any,
  document: Tyr.Document,
  props?: TyrTypeProps<any>
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
    create: true,
  });
};

/**
 * We want to keep the document up-to-date and in-sync with the form so that
 * computed values and computed validations are always up-to-date.
 */
export const onTypeChange = (
  props: TyrTypeProps<any>,
  value: any,
  event?: any
) => {
  const { document } = props;

  // if (event) {
  //   event.stopPropagation();
  //   event.preventDefault();
  //   return false;
  // }

  if (document) {
    if (!props.value) {
      mapFormValueToDocument(props.path!, value, document, props);
    }

    props.onChange?.(value, event, props);
  }
};

export const getFilter = (
  component: TyrComponent<any>,
  props: TyrPathProps<any>
) => {
  const path = props.path!;
  const { filter } = assertTypeUi(props.typeUi || path.tail.type.name);

  return filter ? filter(component, props) : undefined;
};

export const getFinder = (path: Tyr.PathInstance) => {
  const { finder } = assertTypeUi(path.tail.type.name);
  return finder;
};

export const getCellValue = (
  path: Tyr.PathInstance,
  document: Tyr.Document,
  props: TyrTypeProps<any>,
  typeName?: string
) => {
  const { tail: field } = path;

  typeName = props.typeUi || typeName;
  if (typeName) {
    const { cellValue } = assertTypeUi(typeName);
    if (cellValue) return cellValue(path, document, props);
  }

  if (!field.type) return 'Unknown';

  const { cellValue } = assertTypeUi(field.type.name);
  return cellValue
    ? cellValue(path, document, props)
    : field.type.format(field, path.get(document));
};
