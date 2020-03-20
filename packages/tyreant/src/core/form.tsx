import * as React from 'react';

import { observer } from 'mobx-react';

import { Tyr } from 'tyranid/client';

import { Form, Row, Col, message } from 'antd';
import { FormInstance } from 'antd/lib/form';
import { FormLayout, useForm } from 'antd/lib/form/Form';

import { TypeContext, useThemeProps } from '../core/theme';
import { TyrThemedFieldBase, TyrPathExistsProps } from './path';
import { registerComponent } from '../common';
import { TyrOneComponent, TyrOneComponentProps } from './one-component';
import { TyrComponent, useComponent } from './component';

export interface FormRenderComponentProps<D extends Tyr.Document> {
  form: TyrFormBase<D>;
  document: D;
}

export interface TyrFormFields {
  [pathName: string]: any;
}

export interface TyrFormProps<D extends Tyr.Document>
  extends TyrOneComponentProps<D> {
  form?: FormInstance;
  className?: string;
  layout?: FormLayout;
  children?:
    | React.ReactNode
    | ((props: FormRenderComponentProps<D>) => JSX.Element);
  render?: (props: FormRenderComponentProps<D>) => JSX.Element;
}

@observer
export class TyrFormBase<
  D extends Tyr.Document<Tyr.AnyIdType>
> extends TyrOneComponent<D, TyrFormProps<D>> {
  canEdit = true;

  get form() {
    return this.props.form!;
  }

  private renderField(pathProps: TyrPathExistsProps) {
    const { document } = this;

    return (
      <TyrThemedFieldBase
        {...pathProps}
        form={this.form}
        document={document!}
      />
    );
  }

  render() {
    const { document } = this;
    const { className, children, render } = this.props;
    const paths = this.activePaths;

    return this.wrap(() => (
      <Form
        form={this.form}
        layout={this.props.layout || 'vertical'}
        className={'tyr-form' + (className ? ' ' + className : '')}
      >
        <TypeContext.Provider
          value={{
            component: (this as unknown) as TyrComponent,
            form: this.form,
            document
          }}
        >
          {render && document && render({ form: this, document })}
          {paths &&
            !children &&
            !render &&
            (paths as TyrPathExistsProps[]).map(pathProps => {
              const { path } = pathProps; // path might be a string
              return (
                <Row key={path.name || ((path as any) as string)} gutter={10}>
                  <Col span={24}>{this.renderField(pathProps)} </Col>
                </Row>
              );
            })}
          {typeof children === 'function' && document
            ? (children as (
                props: FormRenderComponentProps<D>
              ) => JSX.Element)({ form: this, document })
            : children}
        </TypeContext.Provider>
      </Form>
    ));
  }

  async submit() {
    await submitForm(this, this.document!);
    this.parent?.requery();
  }
}

export const TyrForm = <D extends Tyr.Document>(props: TyrFormProps<D>) => (
  <TyrFormBase
    {...useThemeProps('form', props as TyrFormProps<D>)}
    form={useForm()[0]}
    parent={useComponent()}
  />
);

export function createForm<D extends Tyr.Document>(
  formProps: TyrFormProps<D>,
  WrappedComponent: React.ComponentType<FormRenderComponentProps<D>>
) {
  return () => (
    <TyrForm {...(formProps as any)}>
      {props => <WrappedComponent {...(props as any)} />}
    </TyrForm>
  );
}

registerComponent('TyrForm', TyrForm);

/**
 * returns Promise<true> if the save was successful, Promise<false> if there were validation errors.
 */
export async function submitForm<D extends Tyr.Document>(
  tyrForm: TyrFormBase<D>,
  document: D
): Promise<boolean> {
  const { form } = tyrForm;

  try {
    /*const store = */ await form.validateFields(
      tyrForm.activePaths
        .map(path => path.path?.name)
        .filter(s => s) as string[]
    );

    await document.$save();
    document.$cache();

    const { parent } = tyrForm;
    parent && parent.refresh();

    return true;
  } catch (err) {
    console.log(err);
    if (err.message) message.error(err.message);
    return false;
  }
}
