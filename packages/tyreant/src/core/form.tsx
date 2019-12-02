import * as React from 'react';

import { Tyr } from 'tyranid/client';

import { Row, Col, Form, message } from 'antd';
import { FormComponentProps, WrappedFormUtils } from 'antd/lib/form/Form';

import { TypeContext, TyrTypeProps } from '../type/type';
import { TyrFieldBase, TyrFieldProps, TyrFieldExistsProps } from './field';
import { TyrComponentProps, TyrComponent } from './component';

type TyrFormBaseProps = {
  document: Tyr.Document;
  fields: TyrFieldProps[];
} & FormComponentProps;

export interface TyrFormFields {
  [pathName: string]: any;
}

class TyrFormBase extends React.Component<TyrFormBaseProps> {
  /*
  // this is very useful to track down when there is an infinite re-render cycle
  componentDidUpdate(prevProps: any, prevState: any) {
    Object.entries(this.props).forEach(
      ([key, val]) =>
        prevProps[key] !== val && console.log(`Prop '${key}' changed from`, prevProps[key], ' to ', val)
    );
    if (this.state && prevState) {
      Object.entries(this.state).forEach(
        ([key, val]) =>
          prevState[key] !== val && console.log(`State '${key}' changed`)
      );
    }
  }
  */

  private renderField(fieldProps: TyrFieldExistsProps) {
    const { form, document } = this.props;
    const { field } = fieldProps;

    return (
      <TyrFieldBase
        {...fieldProps}
        path={field.namePath}
        form={form!}
        document={document!}
      />
    );
  }

  render() {
    const { children, fields } = this.props;

    return (
      <Form className="tyr-form">
        <TypeContext.Provider value={(this.props as unknown) as TyrTypeProps}>
          {fields &&
            !children &&
            (fields as TyrFieldExistsProps[]).map(fieldProps => (
              <Row key={fieldProps.field.path} gutter={10}>
                <Col span={24}>{this.renderField(fieldProps)} </Col>
              </Row>
            ))}
          {children}
        </TypeContext.Provider>
      </Form>
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
  canEdit = true;

  form?: WrappedFormUtils;

  getFormRef = (ref: WrappedFormUtils | null) => {
    if (ref) this.form = ref;
  };

  render() {
    const { children } = this.props;

    return this.wrap(() => {
      return (
        <TyrWrappedForm
          ref={this.getFormRef as any}
          fields={this.fields}
          document={this.document!}
        >
          {children}
        </TyrWrappedForm>
      );
    });
  }

  submit() {
    submitForm(this, this.state.document!);
  }
}

/**
 * returns Promise<true> if the save was successful, Promise<false> if there were validation errors.
 */
export function submitForm(
  tyrForm: TyrForm,
  document: Tyr.Document
): Promise<boolean> {
  const { form } = tyrForm;

  return new Promise((resolve, reject) => {
    form!.validateFields(async (err: Error, values: TyrFormFields) => {
      try {
        if (err) {
          resolve(false);
          return;
        }

        // we don't need to map form values here, we map them via onTypeChange on the components themselves

        await document.$save();
        document.$cache();

        const { parent } = tyrForm;
        parent && parent.refresh();

        resolve(true);
      } catch (saveError) {
        if (saveError.message) message.error(saveError.message);
        console.error(saveError);
        reject(false);
      }
    });
  });
}
