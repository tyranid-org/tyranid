import * as React from 'react';

import { CloseOutlined } from '@ant-design/icons';
import { Drawer, Spin } from 'antd';

import { Tyr } from 'tyranid/client';

import {
  TyrDecorator,
  TyrDecoratorProps,
  withThemeAndParent,
} from './decorator';

export interface TyrDrawerProps<D extends Tyr.Document>
  extends TyrDecoratorProps<D> {
  placement?: 'top' | 'right' | 'bottom' | 'left';
}

class TyrDrawerBase<D extends Tyr.Document> extends TyrDecorator<
  D,
  TyrDrawerProps<D>
> {
  componentName = 'Drawer';

  state = {
    visible: false,
    loading: false,
  };

  render() {
    const { children, placement } = this.props;
    const { cancel } = this;
    const { visible, loading } = this.state;

    return (
      <Drawer
        visible={visible}
        closable={false}
        placement={placement || 'right'}
        className={'tyr-drawer'}
      >
        {visible && (
          <div className="tyr-drawer-container">
            <div className="tyr-drawer">
              <div className="tyr-header">
                {!loading && cancel && (
                  <CloseOutlined
                    className="tyr-drawer-close-icon"
                    onClick={() => cancel.act({ caller: this.decorating })}
                  />
                )}
                <h4>{this.title()}</h4>
              </div>
              <Spin spinning={loading}>
                {visible && <div className="tyr-content">{children}</div>}
              </Spin>
              {this.footer()}
            </div>
          </div>
        )}
      </Drawer>
    );
  }
}

export const TyrDrawer = withThemeAndParent('drawer', TyrDrawerBase);
