import { Tyr } from 'tyranid/client';

import { TyrComponent } from './component';

export interface TyrActionFnOpts {
  document?: Tyr.Document;
}

export type TyrActionTrait = 'create' | 'edit' | 'save' | 'cancel';

export interface TyrActionOpts {
  traits: TyrActionTrait[];
  name: string;
  label?: string;
  component: TyrComponent<any>;
  action: (opts: TyrActionFnOpts) => void;
}

export class TyrAction {
  traits: TyrActionTrait[];
  name: string;
  label: string;
  component: TyrComponent;
  action: (opts: TyrActionFnOpts) => void;

  constructor({ traits, name, component, label, action }: TyrActionOpts) {
    this.traits = traits;
    this.name = name;
    this.component = component;
    this.label = label || Tyr.labelize(name);
    this.action = action;
  }

  is(trait: TyrActionTrait) {
    return this.traits.indexOf(trait) >= 0;
  }

  act(opts: TyrActionFnOpts) {
    this.action(opts);
  }

  decorate(opts: Partial<TyrActionOpts>) {
    const newOpts: TyrActionOpts = {
      traits: this.traits,
      name: this.name,
      label: this.label,
      component: this.component,
      action: this.action
    };

    Object.assign(newOpts, opts);

    if (opts.action && this.action) {
      newOpts.action = (fnOpts: TyrActionFnOpts) => {
        this.action(fnOpts);
        opts.action!(fnOpts);
      };
    }

    return new TyrAction(newOpts);
  }
}
