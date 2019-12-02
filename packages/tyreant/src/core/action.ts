import { Tyr } from 'tyranid/client';

import { TyrComponent } from './component';

export interface TyrActionFnOpts {
  document?: Tyr.Document;

  /**
   * if action.multiple === true
   */
  documents?: Tyr.Document[];
}

export type TyrActionTrait = 'create' | 'edit' | 'save' | 'cancel';

export interface TyrActionOpts {
  traits?: TyrActionTrait[];
  name: string;
  label?: string | React.ReactNode;
  component?: TyrComponent<any>;
  multiple?: boolean;

  /**
   * If an action returns false or Promise<false> then the decorator action will not
   * be applied.  Note that undefined/void is treated as returning true (i.e. the
   * decorated action should be performed.
   */
  action?: (opts: TyrActionFnOpts) => void | boolean | Promise<void | boolean>;
  hide?: (doc: Tyr.Document) => boolean;
}

export class TyrAction {
  static get(action: TyrAction | TyrActionOpts) {
    return action instanceof TyrAction ? action : new TyrAction(action);
  }

  traits: TyrActionTrait[];
  name: string;
  label: string | React.ReactNode;
  component?: TyrComponent;
  multiple: boolean;
  action?: (opts: TyrActionFnOpts) => void | boolean | Promise<void | boolean>;
  hide?: (doc: Tyr.Document) => boolean;

  constructor({
    traits,
    name,
    component,
    label,
    multiple,
    action,
    hide
  }: TyrActionOpts) {
    this.traits = traits || [];
    this.name = name;
    this.component = component;
    this.label = label || Tyr.labelize(name);
    this.action = action;
    this.multiple = multiple ?? false;
    this.hide = hide;
  }

  is(trait: TyrActionTrait) {
    return this.traits.indexOf(trait) >= 0;
  }

  act(opts: TyrActionFnOpts) {
    this.action?.(opts);
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
              if (promisedResult === undefined || promisedResult) {
                opts.action!(fnOpts);
              }
            });
        }
      };
    }

    return new TyrAction(newOpts);
  }
}
