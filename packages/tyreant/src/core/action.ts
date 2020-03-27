import { notification } from 'antd';

import { Tyr } from 'tyranid/client';

import { TyrComponent } from './component';

export type ActionSet<D extends Tyr.Document> =
  | { [actionName: string]: TyrAction<D> | Omit<TyrActionOpts<D>, 'name'> }
  | (TyrAction<D> | TyrActionOpts<D>)[];

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

export type Cardinality = 0 | 1 | '0..*' | '*';

export interface TyrActionOpts<D extends Tyr.Document> {
  traits?: TyrActionTrait[];
  name: string;
  self?: TyrComponent<D>;
  label?:
    | string
    | React.ReactNode
    | ((opts: TyrActionFnOpts<D>) => string | React.ReactNode);
  title?: string | React.ReactNode;
  input?: Cardinality;

  /**
   * If an action returns false or Promise<false> then the decorator action will not
   * be applied.  Note that undefined/void is treated as returning true (i.e. the
   * decorated action should be performed.
   */
  action?: (
    opts: TyrActionFnOpts<D>
  ) => void | boolean | Promise<void | boolean>;
  hide?: boolean | ((doc: D) => boolean);
}

export class TyrAction<D extends Tyr.Document = Tyr.Document> {
  static get<D extends Tyr.Document = Tyr.Document>(
    action: TyrAction<D> | TyrActionOpts<D>
  ) {
    return action instanceof TyrAction
      ? action
      : new TyrAction<D>(action as any);
  }

  static parse<D extends Tyr.Document = Tyr.Document>(
    obj: ActionSet<D>
  ): TyrAction<D>[] {
    if (!obj) {
      return [];
    } else if (Array.isArray(obj)) {
      return obj.map(TyrAction.get);
    } else {
      const actions: TyrAction<D>[] = [];

      for (const name in obj) {
        actions.push(
          new TyrAction<D>({
            ...obj[name],
            name
          })
        );
      }

      return actions;
    }
  }

  traits: TyrActionTrait[];
  name: string;
  labelValue:
    | string
    | React.ReactNode
    | ((opts: TyrActionFnOpts<D>) => string | React.ReactNode);
  title: string | React.ReactNode;
  input: Cardinality;
  action?: (
    opts: TyrActionFnOpts<D>
  ) => void | boolean | Promise<void | boolean>;
  hide?: boolean | ((doc: D) => boolean);

  /**
   * This is the component the action was defined on.
   */
  self?: TyrComponent<D>;

  get displayName() {
    const { self } = this;
    return this.name + ':' + (self?.displayName || 'no-self');
  }

  label(component: TyrComponent): string | React.ReactNode {
    const { labelValue } = this;

    return typeof labelValue === 'function'
      ? labelValue(component.actionFnOpts() as any)
      : labelValue;
  }

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
    this.labelValue = label || Tyr.labelize(name);
    this.title = title || this.labelValue;
    this.action = action;
    this.input = input ?? 1;
    this.hide = hide;
  }

  is(trait: TyrActionTrait) {
    return this.traits.indexOf(trait) >= 0;
  }

  isHidden(document?: D) {
    const { hide } = this;

    if (typeof hide === 'function') {
      return hide(document!);
    } else {
      return !!hide;
    }
  }

  act(opts: Omit<TyrActionFnOpts<D>, 'self'>) {
    try {
      this.action?.({ self: this.self as TyrComponent<D>, ...opts });
    } catch (err) {
      console.log(err);
      notification.error(err.message || 'Unknown error');
    }
  }

  decorate(opts: Partial<TyrActionOpts<D>>) {
    const newOpts: TyrActionOpts<D> = {
      traits: this.traits,
      name: this.name,
      label: this.labelValue,
      title: this.title,
      self: this.self,
      action: this.action,
      hide: this.hide,
      input: this.input
    };

    Object.assign(newOpts, opts);

    if (opts.action) {
      newOpts.action = (fnOpts: TyrActionFnOpts<D>) => {
        const result = this.action?.(fnOpts);

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
