// quiet errors
export {};

// the drawer component is not in our version of ant, need to upgrade to newer version

//import * as React from 'react';

//import { Tyr } from 'tyranid/client';

/*
import { Drawer, Button, Spin, Icon } from 'antd';

import { TyrForm, submitForm } from './form';
import { TyrComponent, TyrComponentState } from './component';

export interface TyrFormDrawerState extends TyrComponentState {
  visible: boolean;
  loading: boolean;
}

export class TyrFormDrawer extends TyrComponent<TyrFormDrawerState> {
  state: TyrFormDrawerState = {
    visible: false,
    loading: false,
  };

  async edit(document: Tyr.Document) {
    super.edit(document);
    this.openDrawer();
  }

  openDrawer = () => this.setState({ visible: true });
  closeDrawer = () => this.setState({ visible: false });

  onClickOpenButton = () => {
    this.setState({ document: new this.collection!() });
    this.openDrawer();
  };

  onSubmit = () => {
    try {
      submitForm(this.form!, this.state.document!);
    } catch (saveErr) {
      this.setState({ loading: false });
    }
  };

  onCancel = () => this.closeDrawer();

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
              {children // TODO:  probably should use children in a different way
                `Create ${collection.label}`}
            </Button>

            <Drawer
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
                      ref={this.getFormRef as Tyr.anny}
                      document={document}
                      fields={this.fields}
                    />
                  )}
              </Spin>
            </Drawer>
          </>
        )
      );
    });
  }
}
*/
