import * as React from 'react';
import { TyrAction } from './action';
import { TyrComponent } from './component';

export interface TyrDecorator {
  connect(component: TyrComponent): void;
  enact(action: TyrAction): void;
  wrap(children: () => React.ReactNode): React.ReactNode;
}

export abstract class TyrDecorator {
  component?: TyrComponent;

  connect(component: TyrComponent) {
    if (this.component) throw new Error('decorator was already connected');

    this.component = component;
  }
}
