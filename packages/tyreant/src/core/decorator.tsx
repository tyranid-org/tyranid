import * as React from 'react';

import { Tyr } from 'tyranid/client';

import { TyrAction, TyrActionBar, TyrActionFnOpts } from './action';
import { TyrComponent, useComponent } from './component';
import { TyrThemeProps, useThemeProps } from './theme';

export interface TyrDecoratorProps<D extends Tyr.Document> {
  parent?: TyrComponent<D>;
  className?: string;
}
export interface TyrDecoratorState {
  visible: boolean;
  loading: boolean;
}

/**
 * Similar to how "getFieldDecorator" decorates fields, a TyrDecorator decorates
 * TyrComponents like TyrTable, TyrForm, and so on.
 *
 * Examples of Decorators are modals, drawers, panels, and so on.
 */
export abstract class TyrDecorator<
  D extends Tyr.Document,
  Props extends TyrDecoratorProps<D> = TyrDecoratorProps<D>,
  State extends TyrDecoratorState = TyrDecoratorState
> extends React.Component<Props, State> {
  componentName = 'decorator';

  decorating!: TyrComponent<D>;
  callerOpts?: TyrActionFnOpts<D>;

  constructor(props: Props, state: State) {
    super(props, state);

    const { parent } = props;
    if (parent) {
      this.decorating = parent;
      parent.setDecoratorRef(this);
    }
  }

  get visible() {
    return this.state && this.state.visible;
  }

  setVisible(visible: boolean) {
    this.setState({ visible });
    if (this.decorating) {
      this.decorating.setState({ visible });
    }
  }

  cancel?: TyrAction<D>;
  exitActions: TyrAction<D>[] = [];

  enact(action: TyrAction<D>) {
    if (!this.decorating)
      throw new Error(this.componentName + ' not connected');

    let a: TyrAction<D>;

    if (action.isEntrance()) {
      a = action.decorate({
        on: opts => this.open(opts),
      });
      this.setState({});
    } else if (action.isExit()) {
      a = action.decorate({
        on: () => this.close(),
      });
      this.exitActions.push(a);
      if (action.is('cancel')) this.cancel = a;
    }

    return a!;
  }

  open(opts: TyrActionFnOpts<D>) {
    this.callerOpts = opts;
    this.setVisible(true);
  }

  close() {
    this.setVisible(false);
  }

  title() {
    //(edit && callerOpts?.document && edit.title) ||
    //(create && create.title) ||
    //(edit && edit.title);
    return this.decorating.parentAction?.title;
  }

  footer() {
    return (
      <TyrActionBar
        className={`tyr-footer tyr-${this.componentName}-footer`}
        component={this.decorating}
        actions={this.exitActions}
      />
    );
  }
}

export const withThemeAndParent = <
  K extends keyof TyrThemeProps,
  P extends TyrThemeProps[K]
>(
  type: K,
  ThemedControl: React.ComponentType<P>
) => (props: P) => (
  <ThemedControl
    parent={useComponent()}
    {...useThemeProps(type, props as Required<P>)}
  />
);
