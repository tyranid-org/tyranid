import * as React from 'react';

import { observable } from 'mobx';

import { Tyr } from 'tyranid/client';

import { TyrAction, TyrActionBar, TyrActionFnOpts } from './action';
import { TyrComponent, useComponent } from './component';
import { TyrThemeProps, useThemeProps } from './theme';

export interface TyrDecoratorProps<D extends Tyr.Document> {
  parent?: TyrComponent<D>;
  className?: string;
  defaultOpen?: boolean;
  title?: string;
}

/**
 * Similar to how "getFieldDecorator" decorates fields, a TyrDecorator decorates
 * TyrComponents like TyrTable, TyrForm, and so on.
 *
 * Examples of Decorators are modals, drawers, panels, and so on.
 */

export abstract class TyrDecorator<
  D extends Tyr.Document,
  Props extends TyrDecoratorProps<D> = TyrDecoratorProps<D>
> extends React.Component<Props> {
  componentName = 'decorator';

  @observable
  visible = !!this.props.defaultOpen;

  @observable
  loading = false;

  decorating!: TyrComponent<D>;
  callerOpts?: TyrActionFnOpts<D>;

  constructor(props: Props) {
    super(props);

    const { parent } = props;
    if (parent) {
      this.decorating = parent;
      parent.setDecoratorRef(this);
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
    this.visible = true;
    this.decorating.visible = true;
  }

  close() {
    this.visible = false;
    this.decorating.visible = false;
  }

  title() {
    //(edit && callerOpts?.document && edit.title) ||
    //(create && create.title) ||
    //(edit && edit.title);
    return this.props.title ?? this.decorating.parentAction?.title;
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
