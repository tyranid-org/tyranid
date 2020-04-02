import * as React from 'react';

import { CloseOutlined } from '@ant-design/icons';

import { Drawer, Button, Spin } from 'antd';

import { Tyr } from 'tyranid/client';

import { TyrAction } from './action';
import {
  TyrDecorator,
  TyrDecoratorProps,
  TyrDecoratorState,
  withThemeAndParent
} from './decorator';

export interface TyrDrawerProps<D extends Tyr.Document>
  extends TyrDecoratorProps<D> {
  placement?: 'top' | 'right' | 'bottom' | 'left';
}

export interface TyrDrawerState extends TyrDecoratorState {
  loading: boolean;
}

class TyrDrawerBase<D extends Tyr.Document> extends TyrDecorator<
  D,
  TyrDrawerProps<D>,
  TyrDrawerState
> {
  state: TyrDrawerState = {
    visible: false,
    loading: false
  };

  create?: TyrAction<D>;
  edit?: TyrAction<D>;
  save?: TyrAction<D>;
  cancel?: TyrAction<D>;

  enact(action: TyrAction<D>) {
    if (!this.decorating) throw new Error('drawer not connected');

    if (action.is('create', 'search')) {
      this.create = action.decorate({
        action: () => this.openDrawer()
      });
    } else if (action.is('edit', 'view')) {
      const edit = action.decorate({
        action: () => this.openDrawer()
      });
      this.edit = edit;

      const parent = this.decorating.parent;
      if (parent) parent.enact(edit as any);
    } else if (action.is('save')) {
      this.save = action.decorate({
        action: () => {
          this.closeDrawer();
        }
      });
    } else if (action.is('cancel')) {
      this.cancel = action.decorate({
        action: () => this.closeDrawer()
      });
    }
  }

  openDrawer = () => this.setVisible(true);
  closeDrawer = () => this.setVisible(false);

  renderHeader() {
    const { loading } = this.state;
    const { edit, create, cancel } = this;

    return (
      <div className="tyr-header">
        {!loading && cancel && (
          <CloseOutlined
            className="tyr-drawer-close-icon"
            onClick={() => cancel.act({ caller: this.decorating })}
          />
        )}
        <h4>{create ? create.label : edit ? edit!.label : 'unknown'}</h4>
      </div>
    );
  }

  renderFooter() {
    const { loading } = this.state;
    const { save, cancel } = this;

    return (
      <div className="tyr-footer">
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
    const { children, placement } = this.props;
    const { visible, loading } = this.state;
    console.log('rendering drawer, visible:', visible);

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
        <Drawer
          visible={visible}
          closable={false}
          placement={placement || 'right'}
          className={'tyr'}
        >
          {visible && (
            <div className="tyr-drawer-container">
              <div className="tyr-drawer">
                {this.renderHeader()}
                <Spin spinning={loading}>
                  {visible && <div className="tyr-content">{children}</div>}
                </Spin>
                {this.renderFooter()}
              </div>
            </div>
          )}
        </Drawer>
      </>
    );
  }
}

export const TyrDrawer = withThemeAndParent('drawer', TyrDrawerBase);
