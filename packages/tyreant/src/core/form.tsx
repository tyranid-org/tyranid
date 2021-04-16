import * as React from 'react';

import { observer } from 'mobx-react';

import { Tyr } from 'tyranid/client';

import { Form, Row, Col, message } from 'antd';
import { FormInstance } from 'antd/lib/form';
import { FormLayout, useForm, FormProps } from 'antd/lib/form/Form';

import { TyrActionFnOpts } from '../core';
import { TypeContext, useThemeProps } from '../core/theme';
import { TyrThemedFieldBase, TyrPathExistsProps } from './path';
import { registerComponent } from '../common';
import { TyrOneComponent, TyrOneComponentProps } from './one-component';
import { TyrComponent, useComponent } from './component';

export interface FormRenderComponentProps<D extends Tyr.Document> {
  form: TyrFormBase<D>;
  self: TyrFormBase<D>;
  document: D;
  documents: D[];
  id: Tyr.IdType<D>;
  ids: Tyr.IdType<D>[];
  isNew: boolean;
  caller: TyrComponent<any>;
  component: TyrFormBase<D>;
  store: any;
}

// TODO: This needs to be a proxy that redirects any unknown prop name to form.props
// so that ExtraFormProps are passed through
export class FormRenderComponentPropsWrapper<D extends Tyr.Document>
  implements TyrActionFnOpts<D> {
  form!: TyrFormBase<D>;
  document!: D;
  documents!: D[];

  constructor(form: TyrFormBase<D>, document: D, documents: D[]) {
    this.form = form;
    this.document = document;
    this.documents = documents;
  }

  get caller() {
    // TODO:  is this right?
    return this.form.parent as any;
  }

  get self() {
    return this.form;
  }

  // TODO: Why is this here?
  get component() {
    return this.form;
  }

  get id(): Tyr.IdType<D> {
    return this.document?.$id as Tyr.IdType<D>;
  }

  get ids() {
    return this.documents?.map(d => d.$id);
  }

  get isNew() {
    return !!this.document?.$id;
  }

  get store() {
    return this.form.store;
  }
}

export interface TyrFormFields {
  [pathName: string]: any;
}

export interface TyrFormProps<D extends Tyr.Document>
  extends TyrOneComponentProps<D>,
    Pick<FormProps, 'labelAlign' | 'labelCol' | 'wrapperCol'> {
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
  componentName = 'form';

  get form() {
    return this.props.form!;
  }

  private renderField(pathProps: TyrPathExistsProps<D>) {
    const { props } = this;

    return (
      <TyrThemedFieldBase<D>
        {...pathProps}
        theme={props.theme}
        form={props.form!}
        document={this.document!}
      />
    );
  }

  async validate() {
    const activePaths = this.activePaths
      .map(path => path.path?.name)
      .filter(s => s) as string[];

    return await this.form.validateFields(activePaths);
  }

  render() {
    const { document } = this;
    const {
      className,
      children,
      render,
      labelCol,
      wrapperCol,
      labelAlign,
    } = this.props;
    const paths = this.activePaths;

    return this.wrap(() => (
      <Form
        form={this.props.form!}
        layout={this.props.layout || 'vertical'}
        className={'tyr-form' + (className ? ' ' + className : '')}
        {...(labelCol && { labelCol })}
        {...(wrapperCol && { wrapperCol })}
        {...(labelAlign && { labelAlign })}
      >
        <TypeContext.Provider
          value={{
            component: (this as unknown) as TyrComponent,
            form: this.props.form!,
            document,
          }}
        >
          {render &&
            document &&
            render(
              new FormRenderComponentPropsWrapper(
                this,
                document,
                this.documents
              ) as any
            )}
          {paths &&
            !children &&
            !render &&
            (paths as TyrPathExistsProps<D>[]).map(pathProps => {
              const { path } = pathProps; // path might be a string
              return (
                <Row key={path.name || ((path as any) as string)} gutter={10}>
                  <Col span={24}>{this.renderField(pathProps)} </Col>
                </Row>
              );
            })}
          {typeof children === 'function' ? (
            document ? (
              (children as (props: FormRenderComponentProps<D>) => JSX.Element)(
                new FormRenderComponentPropsWrapper(
                  this,
                  document,
                  this.documents
                ) as any
              )
            ) : (
              <></>
            )
          ) : (
            children
          )}
        </TypeContext.Provider>
      </Form>
    ));
  }

  async submit(): Promise<boolean> {
    const result = await submitForm(this, this.document!);
    if (result) this.parent?.requery();
    return result;
  }
}

export const TyrForm = <D extends Tyr.Document, ExtraFormProps = {}>(
  props: TyrFormProps<D> & ExtraFormProps
) => (
  <TyrFormBase
    {...useThemeProps('form', props as TyrFormProps<D>)}
    form={useForm()[0]}
    parent={useComponent()}
  />
);

export function createForm<D extends Tyr.Document, ExtraFormProps = {}>(
  formProps: TyrFormProps<D>,
  WrappedComponent: React.ComponentType<
    FormRenderComponentProps<D> & ExtraFormProps
  >
) {
  return (extraProps?: ExtraFormProps) => (
    <TyrForm {...(extraProps ? { ...formProps, ...extraProps } : formProps)}>
      {props => (
        <WrappedComponent
          {...(props as FormRenderComponentProps<D> & ExtraFormProps)}
        />
      )}
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
  //const { form } = tyrForm;

  try {
    const v = await tyrForm.validate();

    if (v.errorFields?.length) return false;

    if (!tyrForm.isSearching) {
      tyrForm.trace('submitForm', 'save', document);
      await document.$save();
      document.$cache();

      const { parent } = tyrForm;
      parent && parent.refresh();
    }

    return true;
  } catch (err) {
    console.log(err);
    if (err.message) message.error(err.message);
    return false;
  }
}
