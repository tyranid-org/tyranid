import * as React from 'react';

import { Tyr } from 'tyranid/client';

import { Row, Col, Form, message } from 'antd';
import { FormComponentProps, WrappedFormUtils } from 'antd/lib/form/Form';

import * as type from '../type/type';
import { TyrFieldBase } from './field';

const { Item: FormItem } = Form;

export interface TyrFormProps {
  document: Tyr.Document;
  fields: Tyr.FieldInstance[];
}

export interface TyrFormFields {
  [pathName: string]: any;
}

class TyrFormBase extends React.Component<TyrFormProps & FormComponentProps> {
  //private lastId?: Tyr.AnyIdType;

  private mapDocumentToForm() {
    //const { document } = this.props;
    //const { $id } = document;
    //if ($id === this.lastId) return;
    //this.lastId = $id;
  }

  //componentDidMount() {
  //this.mapDocumentToForm();
  //}

  //componentDidUpdate() {
  //this.mapDocumentToForm();
  //}

  private renderFormItem(field: Tyr.FieldInstance) {
    const { form, document } = this.props;

    return (
      <FormItem key={field.path}>
        <label htmlFor={field.path}>{field.label}</label>
        <TyrFieldBase form={form} field={field} document={document} />
      </FormItem>
    );
  }

  render() {
    const { fields, children } = this.props;

    return (
      <type.TypeContext.Provider
        value={(this.props as any) as type.TyrTypeProps}
      >
        <Form className="tyr-form">
          {fields &&
            fields.map(field => (
              <Row key={field.path} gutter={10}>
                <Col span={24}>{this.renderFormItem(field)} </Col>
              </Row>
            ))}
          {children}
        </Form>
      </type.TypeContext.Provider>
    );
  }
}

export const TyrForm = Form.create<
  TyrFormProps & FormComponentProps
>(/*{ name: 'todo' }*/)(TyrFormBase);

export function submitForm(form: WrappedFormUtils, document: Tyr.Document) {
  const collection = document.$model;

  form.validateFields(async (err: Error, values: TyrFormFields) => {
    try {
      if (err) return;

      for (const pathName in values) {
        const value = values[pathName];
        const field = collection.paths[pathName];
        type.mapFormValueToDocument(field, value, document);
      }

      await document.$save();
      document.$cache();
    } catch (saveError) {
      if (saveError.message) message.error(saveError.message);
      console.error(saveError);
      throw saveError;
    }
  });
}
