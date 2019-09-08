import * as React from 'react';

import { Modal, Button, Spin, Icon } from 'antd';

import { TyrForm, submitForm } from './form';
import { TyrComponent, TyrComponentState } from './component';
import { TyrAction, TyrActionOpts } from './action';
import { TyrComponentProps } from '../core';

export interface TyrFormModalState extends TyrComponentState {
  visible: boolean;
  loading: boolean;
}

export class TyrFormModal extends TyrComponent<
  TyrComponentProps,
  TyrFormModalState
> {
  state: TyrFormModalState = {
    visible: false,
    loading: false
  };

  connect(parent?: TyrComponent) {
    super.connect(parent);

    if (parent) {
      parent.enact(
        new TyrAction({
          name: 'edit',
          component: this,
          action: (opts: TyrActionOpts) => {
            this.find(opts.document!);
            this.openModal();
          }
        })
      );
    }
  }

  openModal = () => this.setState({ visible: true });
  closeModal = () => this.setState({ visible: false });

  onClickOpenButton = () => {
    this.setState({ document: new this.collection!() });
    this.openModal();
  };

  onSubmit = () => {
    try {
      submitForm(this.form!, this.state.document!);
      this.closeModal();
    } catch (saveErr) {
      this.setState({ loading: false });
    }
  };

  onCancel = () => this.closeModal();

  renderHeader() {
    const { collection } = this;
    const { loading, document } = this.state;

    return (
      collection && (
        <div className="tyr-modal-header">
          <h4>
            {document && document.$id ? 'Edit' : 'Create'} {collection.label}
          </h4>
          {!loading && (
            <Icon
              type="close"
              className="tyr-modal-close-icon"
              onClick={this.onCancel}
            />
          )}
        </div>
      )
    );
  }

  renderFooter() {
    const { loading } = this.state;

    return (
      <div>
        <Button key="back" onClick={this.onCancel} loading={loading}>
          Cancel
        </Button>
        <Button
          key="submit"
          type="primary"
          onClick={this.onSubmit}
          loading={loading}
        >
          Save
        </Button>
      </div>
    );
  }

  render() {
    const { onCancel } = this;
    const { children } = this.props;
    const { visible, loading, document } = this.state;

    return this.wrap(() => {
      const { collection } = this;

      return (
        collection && (
          <>
            <Button
              type="primary"
              onClick={this.onClickOpenButton}
              className="tyr-primary-btn"
            >
              Create {collection.label}
            </Button>

            <Modal
              className="tyr-modal"
              visible={visible}
              onCancel={onCancel}
              title={this.renderHeader()}
              footer={this.renderFooter()}
              maskClosable={!loading}
              closable={false}
            >
              <Spin spinning={loading}>
                {visible &&
                  document && (
                    <TyrForm
                      ref={this.getFormRef as any}
                      document={document}
                      fields={this.fields}
                    >
                      {children}
                    </TyrForm>
                  )}
              </Spin>
            </Modal>
          </>
        )
      );
    });
  }
}
