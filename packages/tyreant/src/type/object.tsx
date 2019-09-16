import * as React from 'react';

import { Tyr } from 'tyranid/client';

import {
  byName,
  TyrTypeProps,
  withTypeContext,
  TypeContext,
  mapFormValueToDocument
} from './type';
import FormItem from 'antd/lib/form/FormItem';
import { TyrFieldBase, TyrFieldExistsProps } from '../core';
import { Row, Col } from 'antd';

interface TyrObjectExtraProps {
  fields?: TyrFieldExistsProps[];
}

type TyrObjectProps = TyrTypeProps & TyrObjectExtraProps;

const renderFormItem = (
  props: TyrObjectProps,
  fieldProps: TyrFieldExistsProps
) => {
  const { form, document } = props;
  const { field } = fieldProps;

  return (
    <FormItem key={field!.path}>
      <label htmlFor={field.path}>{field.label}</label>
      <TyrFieldBase
        {...fieldProps}
        path={props.path.walk(field.name)}
        form={form!}
        document={document!}
      />
    </FormItem>
  );
};

export const TyrObjectBase = (props: TyrObjectProps) => {
  const { children, fields } = props;

  const contents = (
    <TypeContext.Provider value={props}>
      {fields &&
        fields.map(fieldProps => (
          <Row key={fieldProps.field.name} gutter={10}>
            <Col span={24}>{renderFormItem(props, fieldProps)} </Col>
          </Row>
        ))}
      {children}
    </TypeContext.Provider>
  );

  const className = props.className;

  return className ? <div className={className}>{contents}</div> : contents;
};

export const TyrObject = withTypeContext<TyrObjectExtraProps>(TyrObjectBase);

byName.object = {
  component: TyrObject,
  mapDocumentValueToFormValue(path: Tyr.NamePathInstance, value: any) {
    const { detail: field } = path;

    /*
    if (value) {
      value = (value as any[]).map(value =>
        mapDocumentValueToFormValue(path, value)
      );
    }
    */

    return value;
  },
  mapFormValueToDocument(
    path: Tyr.NamePathInstance,
    values: any,
    document: Tyr.Document
  ) {
    for (const pathName in values) {
      mapFormValueToDocument(path.walk(pathName), values[pathName], document);
    }
  }
};
