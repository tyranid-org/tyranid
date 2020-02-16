import { Tyr } from 'tyranid/client';

import { TyrComponent } from './component';

export interface TyrActionFnOpts<D extends Tyr.Document> {
  component: TyrComponent<D>;
  document?: D;

  /**
   * if action.multiple === true
   */
  documents?: D[];
}

export type TyrActionTrait = 'create' | 'edit' | 'save' | 'cancel';

export interface TyrActionOpts<D extends Tyr.Document> {
  traits?: TyrActionTrait[];
  name: string;
  label?: string | React.ReactNode;
  component?: TyrComponent<D>;
  multiple?: boolean;

  /**
   * If an action returns false or Promise<false> then the decorator action will not
   * be applied.  Note that undefined/void is treated as returning true (i.e. the
   * decorated action should be performed.
   */
  action?: (
    opts: TyrActionFnOpts<D>
  ) => void | boolean | Promise<void | boolean>;
  hide?: (doc: D) => boolean;
}

export class TyrAction<D extends Tyr.Document = Tyr.Document> {
  static get<D extends Tyr.Document = Tyr.Document>(
    action: TyrAction<D> | TyrActionOpts<D>
  ) {
    return action instanceof TyrAction
      ? action
      : new TyrAction<D>(action as any);
  }

  traits: TyrActionTrait[];
  name: string;
  label: string | React.ReactNode;
  component?: TyrComponent<D>;
  multiple: boolean;
  action?: (
    opts: TyrActionFnOpts<D>
  ) => void | boolean | Promise<void | boolean>;
  hide?: (doc: D) => boolean;

  constructor({
    traits,
    name,
    component,
    label,
    multiple,
    action,
    hide
  }: TyrActionOpts<D>) {
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

  act(opts: TyrActionFnOpts<D>) {
    this.action?.(opts);
  }

  decorate(opts: Partial<TyrActionOpts<D>>) {
    const newOpts: TyrActionOpts<D> = {
      traits: this.traits,
      name: this.name,
      label: this.label,
      component: this.component,
      action: this.action,
      hide: this.hide,
      multiple: this.multiple
    };

    Object.assign(newOpts, opts);

    if (opts.action && this.action) {
      newOpts.action = (fnOpts: TyrActionFnOpts<D>) => {
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

    return new TyrAction<D>(newOpts as any);
  }
}
