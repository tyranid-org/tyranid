import * as React from 'react';

import { Tyr } from 'tyranid/client';

import { TyrAction } from './action';
import { TyrComponent } from './component';

export interface TyrDecoratorProps {}
export interface TyrDecoratorState {
  visible: boolean;
}

export interface TyrDecorator {
  enact(action: TyrAction): void;
}

/**
 * Similar to how "getFieldDecorator" decorates fields, a TyrDecorator decorates
 * TyrComponents like TyrTable, TyrForm, and so on.
 *
 * Examples of Decorators are modals, drawers, panels, and so on.
 */
export abstract class TyrDecorator<
  Props extends TyrDecoratorProps = TyrDecoratorProps,
  State extends TyrDecoratorState = TyrDecoratorState
> extends React.Component<Props, State> {
  component?: TyrComponent;

  get visible() {
    return this.state && this.state.visible;
  }

  setVisible(visible: boolean) {
    this.setState({ visible });
    if (this.component) {
      this.component.setState({ visible });
    }
  }

  connect(component: TyrComponent) {
    if (this.component)
      throw new Tyr.AppError('decorator was already connected');

    this.component = component;
  }
}
