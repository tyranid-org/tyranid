import * as React from 'react';

import { Tyr } from 'tyranid/client';

import { TyrAction } from './action';
import { TyrComponent } from './component';

export interface TyrDecoratorProps {
  className?: string;
}
export interface TyrDecoratorState {
  visible: boolean;
}

export interface TyrDecorator<D extends Tyr.Document> {
  enact(action: TyrAction<D>): void;
}

/**
 * Similar to how "getFieldDecorator" decorates fields, a TyrDecorator decorates
 * TyrComponents like TyrTable, TyrForm, and so on.
 *
 * Examples of Decorators are modals, drawers, panels, and so on.
 */
export abstract class TyrDecorator<
  D extends Tyr.Document,
  Props extends TyrDecoratorProps = TyrDecoratorProps,
  State extends TyrDecoratorState = TyrDecoratorState
> extends React.Component<Props, State> {
  decorating!: TyrComponent<D>;

  get visible() {
    return this.state && this.state.visible;
  }

  setVisible(visible: boolean) {
    this.setState({ visible });
    if (this.decorating) {
      this.decorating.setState({ visible });
    }
  }

  connect(component: TyrComponent<D>) {
    if (this.decorating)
      throw new Tyr.AppError('decorator was already connected');

    this.decorating = component;
  }
}
