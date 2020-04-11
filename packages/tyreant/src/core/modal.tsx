import * as React from 'react';

import { CloseOutlined } from '@ant-design/icons';

import { Modal, Spin } from 'antd';

import { TyrAction, TyrActionFnOpts } from './action';
import {
  TyrDecorator,
  TyrDecoratorProps,
  TyrDecoratorState,
  withThemeAndParent,
} from './decorator';
import { Tyr } from 'tyranid/client';

export interface TyrModalProps<D extends Tyr.Document>
  extends TyrDecoratorProps<D> {}

export interface TyrModalState extends TyrDecoratorState {
  loading: boolean;
}

class TyrModalBase<D extends Tyr.Document> extends TyrDecorator<
  D,
  TyrModalProps<D>,
  TyrModalState
> {
  state: TyrModalState = {
    visible: false,
    loading: false,
  };

  callerOpts?: TyrActionFnOpts<D>;
  cancel?: TyrAction<D>;
  entranceVoidActions: TyrAction<D>[] = [];
  exitActions: TyrAction<D>[] = [];

  enact(action: TyrAction<D>) {
    if (!this.decorating) throw new Error('modal not connected');

    if (action.isEntrance()) {
      const a = action.decorate({
        action: opts => this.openModal(opts),
      });
      this.setState({});

      if (a.input === 0) this.entranceVoidActions.push(a);
      const parent = this.decorating.parent;
      if (parent) parent.enact(a as any);
    } else if (action.isExit()) {
      const a = action.decorate({
        action: () => this.closeModal(),
      });
      this.exitActions.push(a);
      if (a.is('cancel')) this.cancel = a;
    }
  }

  openModal = (opts: TyrActionFnOpts<D>) => {
    this.callerOpts = opts;
    this.setVisible(true);
  };

  closeModal = () => this.setVisible(false);

  renderHeader() {
    const { loading } = this.state;
    const { cancel } = this;

    const title = this.decorating.parentAction?.title;

    return (
      <div className="tyr-modal-header">
        {title && <h4>{title}</h4>}
        {!loading && cancel && (
          <CloseOutlined
            className="tyr-modal-close-icon"
            onClick={() => cancel.act({ caller: this.decorating })}
          />
        )}
      </div>
    );
  }

  renderFooter() {
    return (
      <div>{this.exitActions.map(a => a.renderFrom(this.decorating))}</div>
    );
  }

  render() {
    const { cancel } = this;
    const { children, className } = this.props;
    const { visible, loading } = this.state;

    return (
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
    );
  }
}

export const TyrModal = withThemeAndParent('modal', TyrModalBase);
