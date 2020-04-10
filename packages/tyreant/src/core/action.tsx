import * as React from 'react';
import { Button, notification } from 'antd';

import { Tyr } from 'tyranid/client';

import type { TyrComponent } from './component';
import { isEntranceTrait, isExitTrait } from './trait';

export type ActionSet<D extends Tyr.Document> =
  | { [actionName: string]: TyrAction<D> | Omit<TyrActionOpts<D>, 'name'> }
  | (TyrAction<D> | TyrActionOpts<D>)[];

export interface TyrActionFnOpts<D extends Tyr.Document> {
  self: TyrComponent<D>;

  /**
   * For example, for an edit action defined on a form which is invoked by a table,
   * the "self" will be the form while the "caller" will be the table.
   */
  caller: TyrComponent<D>;

  /**
   * if action.input === 1
   */
  document: D;

  /**
   * Equivalent to documents?.$id
   */
  id: Tyr.IdType<D>;

  /**
   * if action.input === '*'
   */
  documents: D[];

  /**
   * Equivalent to documents?.map(d => d.$id)
   */
  ids: Tyr.IdType<D>[];

  /**
   * Equivalent to !!document?.$id
   */
  isNew: boolean;
}

export class TyrActionFnOptsWrapper<D extends Tyr.Document> {
  self!: TyrComponent<D>;
  caller!: TyrComponent<D>;
  document!: D;
  documents!: D[];

  get id() {
    return this.document?.$id;
  }

  get ids() {
    return this.documents?.map(d => d.$id);
  }

  get isNew() {
    return !!this.document?.$id;
  }
}

export type Cardinality = 0 | 1 | '0..*' | '*';

export interface TyrActionOpts<D extends Tyr.Document> {
  traits?: Tyr.ActionTrait[];
  name: string;
  self?: TyrComponent<D>;
  label?:
    | string
    | React.ReactNode
    | ((opts: TyrActionFnOpts<D>) => string | React.ReactNode);
  title?: string | React.ReactNode;
  input?: Cardinality;

  /**
   * This indicates that this action should behave like a "built-in" / utility
   * function ... i.e. like import/export ... this probably needs to be fleshed out more.
   *
   * Other terms might be:  "generic", "builtin", etc.
   */
  utility?: boolean;

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
            name,
          })
        );
      }

      return actions;
    }
  }

  static merge<D extends Tyr.Document = Tyr.Document>( base: ActionSet<D>, override: ActionSet<D>): TyrAction<D>[] {
    const baseActions = TyrAction.parse(base),
      overrideActions = TyrAction.parse(override);

    if (!baseActions.length) return overrideActions;
    if (!overrideActions.length) return baseActions;

    const mergedActions: TyrAction<D>[] = [];

    for (const a of baseActions) {
      const oa = overrideActions.find(oa => oa.name === a.name);
      if (!oa) {
        mergedActions.push(a);
      }
    }

    mergedActions.push(...overrideActions);
    return mergedActions;
  }

  traits: Tyr.ActionTrait[];
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
  utility?: boolean;

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
    hide,
    utility,
  }: TyrActionOpts<D>) {
    this.traits = traits = traits || [];
    this.name = name;
    this.self = self;
    this.labelValue = label || Tyr.labelize(name);
    this.title = title || this.labelValue;
    this.action = action;
    this.input =
      input ?? (traits.includes('create') || traits.includes('search') ? 0 : 1);
    this.hide = hide;
    this.utility = utility;
  }

  is(...traits: Tyr.ActionTrait[]) {
    for (const trait of traits) {
      if (this.traits.indexOf(trait) >= 0) return true;
    }
    return false;
  }

  isEntrance() {
    return this.traits.some(isEntranceTrait);
  }

  isExit() {
    return this.traits.some(isExitTrait);
  }

  isHidden(document?: D) {
    const { hide } = this;

    if (typeof hide === 'function') {
      return hide(document!);
    } else {
      return !!hide;
    }
  }

  act(opts: Partial<TyrActionFnOpts<D>>) {
    try {
      const { action } = this;

      if (action) {
        const wrapper = new TyrActionFnOptsWrapper<D>();
        Object.assign(wrapper, opts);
        wrapper.self = this.self as TyrComponent<D>;
        action(wrapper as any);
      }
    } catch (err) {
      console.log(err);
      notification.error(err.message || 'Unknown error');
    }
  }

  get className() {
    return 'tyr-action tyr-action-' + Tyr.kebabize(this.name);
  }

  button(component: TyrComponent<any>) {
    if (this.input === '*') {
      return (
        <Button
          className={this.className}
          disabled={!component.selectedIds?.length}
          key={`a_${this.name}`}
          onClick={() => this.act(component.actionFnOpts() as any)}
        >
          {this.label(component)}
        </Button>
      );
    } else {
      return (
        <Button
          className={this.className}
          key={`a_${this.name}`}
          onClick={() => this.act(component.actionFnOpts() as any)}
        >
          {this.label(component)}
        </Button>
      );
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
      input: this.input,
      utility: this.utility,
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
