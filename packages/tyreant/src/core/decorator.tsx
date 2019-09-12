import * as React from 'react';
import { TyrAction } from './action';
import { TyrComponent } from './component';

export interface TyrDecoratorProps {}
export interface TyrDecoratorState {
  visible: boolean;
}

export interface TyrDecorator {
  enact(action: TyrAction): void;
}

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
    if (this.component) throw new Error('decorator was already connected');

    this.component = component;
  }
}
