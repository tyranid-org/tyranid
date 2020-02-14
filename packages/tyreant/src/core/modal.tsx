import * as React from 'react';

import { Modal, Button, Spin, Icon } from 'antd';

import { TyrAction } from './action';
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

  enact(action: TyrAction<D>) {
    if (!this.component) throw new Error('modal not connected');

    if (action.is('create')) {
      this.create = action.decorate({
        action: () => this.openModal()
      });
      this.setState({});
    } else if (action.is('edit')) {
      const edit = action.decorate({
        action: () => this.openModal()
      });
      this.edit = edit;

      const parent = this.component.parent;
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

  openModal = () => this.setVisible(true);
  closeModal = () => this.setVisible(false);

  renderHeader() {
    const { loading } = this.state;
    const { edit, create, cancel } = this;

    return (
      <div className="tyr-modal-header">
        <h4>{create ? create.label : edit ? edit!.label : 'unknown'}</h4>
        {!loading && cancel && (
          <Icon
            type="close"
            className="tyr-modal-close-icon"
            onClick={() => cancel.act({ component: this.component })}
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
            onClick={() => cancel.act({ component: this.component })}
            loading={loading}
          >
            {cancel.label}
          </Button>
        )}
        {save && (
          <Button
            key="submit"
            type="primary"
            onClick={() => save.act({ component: this.component })}
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
            onClick={() => create.act({ component: this.component })}
            className="tyr-primary-btn"
          >
            {create.label}
          </Button>
        )}

        <Modal
          className={'tyr-modal' + (className ? ' ' + className : '')}
          visible={visible}
          onCancel={() => cancel!.act({ component: this.component })}
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
