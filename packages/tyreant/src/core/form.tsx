import * as React from 'react';

import { observer } from 'mobx-react';

import { Tyr } from 'tyranid/client';

import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';

import { Row, Col, message } from 'antd';
import { FormComponentProps, WrappedFormUtils } from '@ant-design/compatible/lib/form/Form';

import { TyrTypeProps } from '../type/type';
import { TypeContext, useThemeProps } from '../core/theme';
import { TyrThemedFieldBase, TyrPathProps, TyrPathExistsProps } from './path';
import { registerComponent } from '../common';
import { TyrOneComponent, TyrOneComponentProps } from './one-component';
import { useComponent } from './component';

type TyrFormBaseProps = {
  // form is the rc-form, component is the TyrForm
  className?: string;
  component: TyrFormOuter<Tyr.Document>;
  document: Tyr.Document;
  paths: TyrPathProps[];
  render?: (props: {
    form: TyrFormOuter<Tyr.Document>;
    document: Tyr.Document;
  }) => JSX.Element;
} & FormComponentProps;

export interface TyrFormFields {
  [pathName: string]: any;
}

@observer
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

  private renderField(pathProps: TyrPathExistsProps) {
    const { form, document } = this.props;

    return (
      <TyrThemedFieldBase {...pathProps} form={form!} document={document!} />
    );
  }

  render() {
    const {
      className,
      children,
      paths,
      document,
      component,
      render
    } = this.props;

    return (
      <Form className={'tyr-form' + (className ? ' ' + className : '')}>
        <TypeContext.Provider value={(this.props as unknown) as TyrTypeProps}>
          {render && document && render({ form: component, document })}
          {paths &&
            !children &&
            !render &&
            (paths as TyrPathExistsProps[]).map(pathProps => (
              <Row key={pathProps.path.name} gutter={10}>
                <Col span={24}>{this.renderField(pathProps)} </Col>
              </Row>
            ))}
          {typeof children === 'function'
            ? document && children({ form: component, document })
            : children}
        </TypeContext.Provider>
      </Form>
    );
  }
}

const TyrWrappedForm = Form.create<TyrFormBaseProps>(/*{ name: 'todo' }*/)(
  TyrFormBase
);

export interface FormRenderComponentProps<D extends Tyr.Document> {
  form: TyrFormOuter<D>;
  document: D;
}

/*
 * TODO:  figure out some way to eliminate the need for Form.create so that we can have
 *
 *        TyrForm
 *
 *        instead of
 *
 *        TyrForm(TyrWrappedForm(TyrFormBase))
 */
export interface TyrFormProps<D extends Tyr.Document>
  extends TyrOneComponentProps<D> {
  className?: string;
  children?:
    | React.ReactNode
    | ((props: FormRenderComponentProps<D>) => JSX.Element);
  render?: (props: FormRenderComponentProps<D>) => JSX.Element;
}

@observer
export class TyrFormOuter<
  D extends Tyr.Document<Tyr.AnyIdType>
> extends TyrOneComponent<D, TyrFormProps<D>> {
  canEdit = true;

  form?: WrappedFormUtils;

  setFormRef = (ref: WrappedFormUtils | null) => {
    if (ref) this.form = ref;
  };

  render() {
    const { className, children, render } = this.props;

    return this.wrap(() => {
      return (
        <TyrWrappedForm
          className={className}
          ref={this.setFormRef as any}
          paths={this.activePaths}
          document={this.document!}
          component={this as any}
          render={render as any}
        >
          {children}
        </TyrWrappedForm>
      );
    });
  }

  async submit() {
    await submitForm(this, this.document!);
    this.parent?.requery();
  }
}

export const TyrForm = <D extends Tyr.Document>(props: TyrFormProps<D>) => (
  <TyrFormOuter
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
export function submitForm<D extends Tyr.Document>(
  tyrForm: TyrFormOuter<D>,
  document: D
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
