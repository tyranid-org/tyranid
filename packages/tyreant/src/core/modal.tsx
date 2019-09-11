import * as React from 'react';

import { Modal, Button, Spin, Icon } from 'antd';

import { TyrAction } from './action';
import { TyrDecorator } from './decorator';

// NOTE:  if we could get a ref from a pre-existing JSXElement then we wouldn't need to have both a TyrModal and a TyrModalImpl class
//        might be able to solve this with React.cloneElement(theDecoratorJsx, { ref: myRef }, children);

export class TyrModal extends TyrDecorator {
  impl?: TyrModalImpl = undefined;
  create?: TyrAction;
  edit?: TyrAction;
  save?: TyrAction;
  cancel?: TyrAction;

  getRef = (ref: TyrModalImpl | null) => {
    if (ref) this.impl = ref;
  };

  enact(action: TyrAction) {
    if (!this.component) throw new Error('modal not connected');

    if (action.is('create')) {
      this.create = action.decorate({
        action: () => this.impl!.openModal()
      });
    } else if (action.is('edit')) {
      const edit = action.decorate({
        action: () => this.impl!.openModal()
      });
      this.edit = edit;

      const parent = this.component.parent;
      if (parent) parent.enact(edit);
    } else if (action.is('save')) {
      this.save = action.decorate({
        action: () => this.impl!.closeModal()
      });
    } else if (action.is('cancel')) {
      this.cancel = action.decorate({
        action: () => this.impl!.closeModal()
      });
    }
  }

  wrap(children: () => React.ReactNode) {
    return (
      <TyrModalImpl decorator={this} ref={this.getRef}>
        {children()}
      </TyrModalImpl>
    );
  }
}

export interface TyrModalProps {
  decorator: TyrModal;
}

export interface TyrModalState {
  visible: boolean;
  loading: boolean;
}

export class TyrModalImpl extends React.Component<
  TyrModalProps,
  TyrModalState
> {
  state: TyrModalState = {
    visible: false,
    loading: false
  };

  openModal = () => this.setState({ visible: true });
  closeModal = () => this.setState({ visible: false });

  renderHeader() {
    const { loading } = this.state;
    const { edit, create, cancel } = this.props.decorator;

    return (
      <div className="tyr-modal-header">
        <h4>{create ? create.label : edit ? edit!.label : 'unknown'}</h4>
        {!loading &&
          cancel && (
            <Icon
              type="close"
              className="tyr-modal-close-icon"
              onClick={() => cancel.act({})}
            />
          )}
      </div>
    );
  }

  renderFooter() {
    const { loading } = this.state;
    const { save, cancel } = this.props.decorator;

    return (
      <div>
        {cancel && (
          <Button key="back" onClick={() => cancel.act({})} loading={loading}>
            {cancel.label}
          </Button>
        )}
        {save && (
          <Button
            key="submit"
            type="primary"
            onClick={() => save.act({})}
            loading={loading}
          >
            {save.label}
          </Button>
        )}
      </div>
    );
  }

  render() {
    const { children, decorator } = this.props;
    const { visible, loading } = this.state;
    const { cancel, create } = decorator;

    return (
      <>
        {create && (
          <Button
            type="primary"
            onClick={() => create.act({})}
            className="tyr-primary-btn"
          >
            {create.label}
          </Button>
        )}

        <Modal
          className="tyr-modal"
          visible={visible}
          onCancel={() => cancel!.act({})}
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
