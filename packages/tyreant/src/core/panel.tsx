import * as React from 'react';

import { TyrAction, TyrActionFnOpts } from './action';
import {
  TyrDecorator,
  TyrDecoratorProps,
  TyrDecoratorState,
  withThemeAndParent,
} from './decorator';
import { Tyr } from 'tyranid/client';

export interface TyrPanelProps<D extends Tyr.Document>
  extends TyrDecoratorProps<D> {}

export interface TyrPanelState extends TyrDecoratorState {}

class TyrPanelBase<D extends Tyr.Document> extends TyrDecorator<
  D,
  TyrPanelProps<D>,
  TyrPanelState
> {
  state: TyrPanelState = {
    visible: true,
  };

  create?: TyrAction<D>;
  edit?: TyrAction<D>;
  save?: TyrAction<D>;
  cancel?: TyrAction<D>;
  callerOpts?: TyrActionFnOpts<D>;

  enact(action: TyrAction<D>) {
    if (!this.decorating) throw new Error('panel not connected');

    if (action.is('create', 'search')) {
      this.create = action.decorate({
        action: opts => this.open(opts),
      });
      this.setState({});
    } else if (action.is('edit', 'view')) {
      const edit = action.decorate({
        action: opts => this.open(opts),
      });
      this.edit = edit;

      const parent = this.decorating.parent;
      if (parent) parent.enact(edit as any);
    } else if (action.is('save')) {
      this.save = action.decorate({
        action: () => this.close(),
      });
    } else if (action.is('cancel')) {
      this.cancel = action.decorate({
        action: () => this.close(),
      });
    }
  }

  open = (opts: TyrActionFnOpts<D>) => {
    this.callerOpts = opts;
    this.setVisible(true);
  };

  close = () => this.setVisible(false);

  renderHeader() {
    const { edit, create, callerOpts } = this;

    const title =
      (edit && callerOpts?.document && edit.title) ||
      (create && create.title) ||
      (edit && edit.title);

    return (
      title && (
        <div className="tyr-panel-header">
          <h4>{title}</h4>
        </div>
      )
    );
  }

  renderFooter() {
    const { save /*, cancel */ } = this;

    return (
      <div>
        {/* cancel?.button(this.decorating) */}
        {save?.button(this.decorating)}
      </div>
    );
  }

  render() {
    const { cancel, create } = this;
    const { children, className } = this.props;

    return (
      <>
        {create && this.decorating.parent && create.button(this.decorating)}
        <div
          className={'tyr-panel' + (className ? ' ' + className : '')}
          //onCancel={() => cancel!.act({ caller: this.decorating })}
        >
          {this.renderHeader()}
          {children}
          {this.renderFooter()}
        </div>
      </>
    );
  }
}

export const TyrPanel = withThemeAndParent('panel', TyrPanelBase);
