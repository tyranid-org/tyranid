import { Tyr } from 'tyranid/client';

import { TyrComponent } from './component';

export interface TyrActionFnOpts<D extends Tyr.Document> {
  self: TyrComponent<D>;

  caller: TyrComponent<D>;

  /**
   * if action.input === 1
   */
  document?: D;

  /**
   * if action.input === '*'
   */
  documents?: D[];
}

export type TyrActionTrait = 'create' | 'edit' | 'save' | 'cancel';

export interface TyrActionOpts<D extends Tyr.Document> {
  traits?: TyrActionTrait[];
  name: string;
  self?: TyrComponent<D>;
  label?: string | React.ReactNode;
  title?: string | React.ReactNode;
  input?: 0 | 1 | '*';

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
  title: string | React.ReactNode;
  input: 0 | 1 | '*';
  action?: (
    opts: TyrActionFnOpts<D>
  ) => void | boolean | Promise<void | boolean>;
  hide?: (doc: D) => boolean;

  /**
   * This is the component the action was defined on.
   */
  self?: TyrComponent<D>;

  constructor({
    traits,
    name,
    self,
    label,
    title,
    input,
    action,
    hide
  }: TyrActionOpts<D>) {
    this.traits = traits || [];
    this.name = name;
    this.self = self;
    this.label = label || Tyr.labelize(name);
    this.title = title || this.label;
    this.action = action;
    this.input = input ?? 1;
    this.hide = hide;
  }

  is(trait: TyrActionTrait) {
    return this.traits.indexOf(trait) >= 0;
  }

  act(opts: Omit<TyrActionFnOpts<D>, 'self'>) {
    this.action?.({ self: this.self as TyrComponent<D>, ...opts });
  }

  decorate(opts: Partial<TyrActionOpts<D>>) {
    const newOpts: TyrActionOpts<D> = {
      traits: this.traits,
      name: this.name,
      label: this.label,
      title: this.title,
      self: this.self,
      action: this.action,
      hide: this.hide,
      input: this.input
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
