import * as React from 'react';

import { Tyr } from 'tyranid/client';

import { Row, Col, Form, message } from 'antd';
import { FormComponentProps, WrappedFormUtils } from 'antd/lib/form/Form';

import { TypeContext, TyrTypeProps } from '../type/type';
import { TyrFieldBase, TyrFieldProps, TyrFieldExistsProps } from './field';
import { TyrComponentProps, TyrComponent } from './component';
import { TyrAction, TyrActionFnOpts } from './action';

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
        prevProps[key] !== val && console.log(`Prop '${key}' changed`)
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
  form?: WrappedFormUtils;

  componentDidMount() {
    const { linkToParent, props } = this;

    if (!this.collection)
      throw new Error('could not determine collection for form');

    if (props.actions) {
      for (const action of props.actions) {
        // TODO:  clone action instead?
        action.component = this;
        const actFn = action.action;

        if (!actFn && action.is('edit')) {
          action.action = opts => {
            this.find(opts.document!);

            if (!this.document) {
              this.setState({ document: this.createDocument(opts) });
            }
          };
        } else if (actFn && action.is('save')) {
          action.action = opts => {
            actFn({ ...opts, document: this.document });
          };
        }

        this.enactUp(action);
      }

      this.enactUp(
        new TyrAction({
          traits: ['cancel'],
          name: 'cancel',
          component: this,
          action: opts => {}
        })
      );

      return;
    }

    if (linkToParent) {
      this.enactUp(
        new TyrAction({
          traits: ['edit'],
          name: this.collection!.label,
          component: this,
          action: async opts => {
            await this.find(opts.document!);

            if (!this.document) {
              this.setState({ document: this.createDocument(opts) });
            }
          }
        })
      );
    } else {
      this.enactUp(
        new TyrAction({
          traits: ['edit'],
          name: 'edit',
          component: this,
          action: opts => {
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
          action: opts => {
            this.setState({ document: this.createDocument(opts) });
          }
        })
      );
    }

    this.enactUp(
      new TyrAction({
        traits: ['cancel'],
        name: 'cancel',
        component: this,
        action: opts => {}
      })
    );

    this.enactUp(
      new TyrAction({
        traits: ['save'],
        name: 'save',
        component: this,
        action: (opts: TyrActionFnOpts) =>
          submitForm(this.form!, this.state.document!)
      })
    );
  }

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
}

/**
 * returns Promise<true> if the save was successful, Promise<false> if there were validation errors.
 */
export function submitForm(
  form: WrappedFormUtils,
  document: Tyr.Document
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    form.validateFields(async (err: Error, values: TyrFormFields) => {
      try {
        if (err) {
          resolve(false);
          return;
        }

        // we don't need to map form values here, we map them via onTypeChange on the components themselves

        await document.$save();
        document.$cache();
        resolve(true);
      } catch (saveError) {
        if (saveError.message) message.error(saveError.message);
        console.error(saveError);
        reject(false);
      }
    });
  });
}
