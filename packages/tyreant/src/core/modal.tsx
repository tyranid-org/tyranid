import * as React from 'react';

import { Modal, Spin } from 'antd';
import { CloseOutlined } from '@ant-design/icons';

import { Tyr } from 'tyranid/client';

import { TyrDecorator, withThemeAndParent } from './decorator';

class TyrModalBase<D extends Tyr.Document> extends TyrDecorator<D> {
  componentName = 'modal';

  state = {
    visible: false,
    loading: false,
  };

  render() {
    const { cancel } = this;
    const { children, className } = this.props;
    const { visible, loading } = this.state;
    const title = this.title();

    return (
      <Modal
        className={'tyr-modal' + (className ? ' ' + className : '')}
        visible={visible}
        onCancel={() => cancel!.act({ caller: this.decorating })}
        title={
          <div className="tyr-header tyr-modal-header">
            {title && <h4>{title}</h4>}
            {!loading && cancel && (
              <CloseOutlined
                className="tyr-modal-close-icon"
                onClick={() => cancel.act({ caller: this.decorating })}
              />
            )}
          </div>
        }
        footer={this.footer()}
        maskClosable={!loading}
        closable={false}
      >
        <Spin spinning={loading}>{visible && children}</Spin>
      </Modal>
    );
  }
}

export const TyrModal = withThemeAndParent('modal', TyrModalBase);
