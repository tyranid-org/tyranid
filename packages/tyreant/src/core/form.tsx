import * as React from 'react';

import { observer } from 'mobx-react';

import { Tyr } from 'tyranid/client';

import { Form, Row, Col, message } from 'antd';
import { FormInstance } from 'antd/lib/form';
import { FormLayout } from 'antd/lib/form/Form';

import { TyrTypeProps } from '../type/type';
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

  formRef = React.createRef<FormInstance>();

  get form() {
    return this.formRef.current!;
  }

  private renderField(pathProps: TyrPathExistsProps) {
    const { document } = this;

    return (
      <TyrThemedFieldBase
        {...pathProps}
        form={this.form!}
        document={document!}
      />
    );
  }

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

  render() {
    const { document } = this;
    const { className, children, paths, render } = this.props;

    return this.wrap(() => {
      const props: TyrTypeProps = {
        component: (this as unknown) as TyrComponent,
        form: this.form,
        document
      };

      return (
        <Form
          ref={this.formRef}
          layout={this.props.layout || 'vertical'}
          className={'tyr-form' + (className ? ' ' + className : '')}
        >
          <TypeContext.Provider value={props}>
            {render && document && render({ form: this, document })}
            {paths &&
              !children &&
              !render &&
              (paths as TyrPathExistsProps[]).map(pathProps => (
                <Row key={pathProps.path.name} gutter={10}>
                  <Col span={24}>{this.renderField(pathProps)} </Col>
                </Row>
              ))}
            {typeof children === 'function' && document
              ? (children as (
                  props: FormRenderComponentProps<D>
                ) => JSX.Element)({ form: this, document })
              : children}
          </TypeContext.Provider>
        </Form>
      );
    });
  }

  async submit() {
    await submitForm(this, this.document!);
    this.parent?.requery();
  }
}

export const TyrForm = <D extends Tyr.Document>(props: TyrFormProps<D>) => (
  <TyrFormBase
    {...useThemeProps('form', props as TyrFormProps<D>)}
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
