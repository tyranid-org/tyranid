import * as React from 'react';

import { Modal, Button, Spin, Icon } from 'antd';

import { TyrAction, TyrActionFnOpts } from './action';
import {
  TyrDecorator,
  TyrDecoratorProps,
  TyrDecoratorState
} from './decorator';
import { Tyr } from 'tyranid/client';

export interface TyrModalProps extends TyrDecoratorProps {}

export interface TyrModalState extends TyrDecoratorState {
  loading: boolean;
}

export class TyrModal<D extends Tyr.Document> extends TyrDecorator<
  D,
  TyrModalProps,
  TyrModalState
> {
  state: TyrModalState = {
    visible: false,
    loading: false
  };

  create?: TyrAction<D>;
  edit?: TyrAction<D>;
  save?: TyrAction<D>;
  cancel?: TyrAction<D>;
  callerOpts?: TyrActionFnOpts<D>;

  enact(action: TyrAction<D>) {
    if (!this.decorating) throw new Error('modal not connected');

    if (action.is('create')) {
      this.create = action.decorate({
        action: opts => this.openModal(opts)
      });
      this.setState({});
    } else if (action.is('edit')) {
      const edit = action.decorate({
        action: opts => this.openModal(opts)
      });
      this.edit = edit;

      const parent = this.decorating.parent;
      if (parent) parent.enact(edit as any);
    } else if (action.is('save')) {
      this.save = action.decorate({
        action: () => {
          this.closeModal();
        }
      });
    } else if (action.is('cancel')) {
      this.cancel = action.decorate({
        action: () => this.closeModal()
      });
    }
  }

  openModal = (opts: TyrActionFnOpts<D>) => {
    this.callerOpts = opts;
    this.setVisible(true);
  };

  closeModal = () => this.setVisible(false);

  renderHeader() {
    const { loading } = this.state;
    const { edit, create, cancel, callerOpts } = this;

    const label =
      (edit && callerOpts?.document && edit.label) ||
      (create && create.label) ||
      'unknown';

    return (
      <div className="tyr-modal-header">
        <h4>{label}</h4>
        {!loading && cancel && (
          <Icon
            type="close"
            className="tyr-modal-close-icon"
            onClick={() => cancel.act({ caller: this.decorating })}
          />
        )}
      </div>
    );
  }

  renderFooter() {
    const { loading } = this.state;
    const { save, cancel } = this;

    return (
      <div>
        {cancel && (
          <Button
            key="back"
            onClick={() => cancel.act({ caller: this.decorating })}
            loading={loading}
          >
            {cancel.label}
          </Button>
        )}
        {save && (
          <Button
            key="submit"
            type="primary"
            onClick={() => save.act({ caller: this.decorating })}
            loading={loading}
          >
            {save.label}
          </Button>
        )}
      </div>
    );
  }

  render() {
    const { cancel, create } = this;
    const { children, className } = this.props;
    const { visible, loading } = this.state;

    return (
      <>
        {create && (
          <Button
            type="primary"
            onClick={() => create.act({ caller: this.decorating })}
            className="tyr-primary-btn"
          >
            {create.label}
          </Button>
        )}

        <Modal
          className={'tyr-modal' + (className ? ' ' + className : '')}
          visible={visible}
          onCancel={() => cancel!.act({ caller: this.decorating })}
          title={this.renderHeader()}
          footer={this.renderFooter()}
          maskClosable={!loading}
          closable={false}
        >
          <Spin spinning={loading}>{visible && children}</Spin>
        </Modal>
      </>
    );
  }
}
