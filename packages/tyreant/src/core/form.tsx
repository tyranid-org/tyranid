import * as React from 'react';

import { Tyr } from 'tyranid/client';

import { Row, Col, Form, message } from 'antd';
import { FormComponentProps, WrappedFormUtils } from 'antd/lib/form/Form';

import * as type from '../type/type';
import { TyrFieldBase, TyrFieldProps, TyrFieldExistsProps } from './field';
import { TyrComponentProps, TyrComponent } from './component';
import { TyrAction, TyrActionFnOpts } from './action';

const { Item: FormItem } = Form;

type TyrFormBaseProps = {
  document: Tyr.Document;
  fields: TyrFieldProps[];
} & FormComponentProps;

export interface TyrFormFields {
  [pathName: string]: any;
}

class TyrFormBase extends React.Component<TyrFormBaseProps> {
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

  private renderFormItem(fieldProps: TyrFieldExistsProps) {
    const { form, document } = this.props;
    const { field } = fieldProps;

    return (
      <FormItem key={field!.path}>
        <label htmlFor={field.path}>{field.label}</label>
        <TyrFieldBase {...fieldProps} form={form!} document={document!} />
      </FormItem>
    );
  }

  render() {
    const { children, fields } = this.props;

    return (
      <type.TypeContext.Provider
        value={(this.props as unknown) as type.TyrTypeProps}
      >
        <Form className="tyr-form">
          {fields &&
            (fields as TyrFieldExistsProps[]).map(fieldProps => (
              <Row key={fieldProps.field.path} gutter={10}>
                <Col span={24}>{this.renderFormItem(fieldProps)} </Col>
              </Row>
            ))}
          {children}
        </Form>
      </type.TypeContext.Provider>
    );
  }
}

const TyrWrappedForm = Form.create<TyrFormBaseProps>(/*{ name: 'todo' }*/)(
  TyrFormBase
);

/*
 * TODO:  figure out some way to eliminate the need for Form.create so that we can have
 *
 *        TyrForm
 * 
 *        instead of
 * 
 *        TyrForm(TyrWrappedForm(TyrFormBase))
 */
export interface TyrFormProps extends TyrComponentProps {}

export class TyrForm extends TyrComponent<TyrFormProps> {
  form?: WrappedFormUtils;

  componentDidMount() {
    const { linkToParent } = this;

    if (!this.collection)
      throw new Error('could not determine collection for form');

    if (linkToParent) {
      this.enactUp(
        new TyrAction({
          traits: ['edit'],
          name: Tyr.pluralize(this.collection!.label),
          component: this,
          action: (opts: TyrActionFnOpts) => {
            this.find(opts.document!);
          }
        })
      );
    } else {
      this.enactUp(
        new TyrAction({
          traits: ['edit'],
          name: 'edit',
          component: this,
          action: (opts: TyrActionFnOpts) => {
            this.find(opts.document!);
          }
        })
      );

      this.enactUp(
        new TyrAction({
          traits: ['create'],
          name: 'create',
          label: 'Create ' + this.collection.label,
          component: this,
          action: (opts: TyrActionFnOpts) => {
            this.setState({ document: new this.collection!() });
          }
        })
      );
    }

    this.enactUp(
      new TyrAction({
        traits: ['cancel'],
        name: 'cancel',
        component: this,
        action: (opts: TyrActionFnOpts) => {}
      })
    );

    this.enactUp(
      new TyrAction({
        traits: ['save'],
        name: 'save',
        component: this,
        action: (opts: TyrActionFnOpts) => {
          submitForm(this.form!, this.state.document!);
        }
      })
    );
  }

  getFormRef = (ref: WrappedFormUtils | null) => {
    if (ref) this.form = ref;
  };

  render() {
    const { children } = this.props;

    return this.wrap(() => (
      <TyrWrappedForm
        ref={this.getFormRef as any}
        fields={this.fields}
        document={this.document!}
      >
        {children}
      </TyrWrappedForm>
    ));
  }
}

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
