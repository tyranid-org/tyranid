import { Tyr } from 'tyranid/client';

import { TyrComponent } from './component';

export interface TyrActionFnOpts {
  document?: Tyr.Document;
}

export type TyrActionTrait = 'create' | 'edit' | 'save' | 'cancel';

export interface TyrActionOpts {
  traits?: TyrActionTrait[];
  name: string;
  label?: string | React.ReactNode;
  component?: TyrComponent<any>;

  /**
   * If an action returns false or Promise<false> then the decorator action will not
   * be applied.  Note that undefined/void is treated as returning true (i.e. the
   * decorated action should be performed.
   */
  action?: (opts: TyrActionFnOpts) => void | boolean | Promise<boolean>;
  hide?: (doc: Tyr.Document) => boolean;
}

export class TyrAction {
  traits: TyrActionTrait[];
  name: string;
  label: string | React.ReactNode;
  component?: TyrComponent;
  action?: (opts: TyrActionFnOpts) => void | boolean | Promise<boolean>;
  hide?: (doc: Tyr.Document) => boolean;

  constructor({ traits, name, component, label, action, hide }: TyrActionOpts) {
    this.traits = traits || [];
    this.name = name;
    this.component = component;
    this.label = label || Tyr.labelize(name);
    this.action = action;
    this.hide = hide;
  }

  is(trait: TyrActionTrait) {
    return this.traits.indexOf(trait) >= 0;
  }

  act(opts: TyrActionFnOpts) {
    this.action && this.action(opts);
  }

  decorate(opts: Partial<TyrActionOpts>) {
    const newOpts: TyrActionOpts = {
      traits: this.traits,
      name: this.name,
      label: this.label,
      component: this.component,
      action: this.action,
      hide: this.hide
    };

    Object.assign(newOpts, opts);

    if (opts.action && this.action) {
      newOpts.action = (fnOpts: TyrActionFnOpts) => {
        const result = this.action && this.action(fnOpts);

        switch (typeof result) {
          case 'undefined':
            opts.action!(fnOpts);
            break;
          case 'boolean':
            if (result) {
              opts.action!(fnOpts);
            }
            break;
          default:
            result.then(promisedResult => {
              if (promisedResult) {
                opts.action!(fnOpts);
              }
            });
        }
      };
    }

    return new TyrAction(newOpts);
  }
}
