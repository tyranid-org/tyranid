import * as React from 'react';
import { Fragment } from 'react';
import { Button, Col, Row, notification } from 'antd';


import { Tyr } from 'tyranid/client';

import type { TyrComponent } from './component';
import { isEntranceTrait, isExitTrait } from './trait';

export type ActionSet<D extends Tyr.Document> =
  | { [actionName: string]: TyrAction<D> | TyrActionOpts<D> }
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
  name?: string;
  self?: TyrComponent<D>;
  label?:
    | string
    | React.ReactNode
    | ((opts: TyrActionFnOpts<D>) => string | React.ReactNode);
  render?:
    //| React.ReactNode
    | ((opts: TyrActionFnOpts<D>) => React.ReactNode);
  title?: string | React.ReactNode;
  input?: Cardinality;

  /**
   * This indicates that this action should behave like a "built-in" / utility
   * function ... i.e. like import/export ... this probably needs to be fleshed out more.
   *
   * Probably not a great name, other terms might be:  "generic", "builtin", etc. ?
   */
  utility?: boolean;

  align?: 'left' | 'center' | 'right';

  /**
   * Default order is 100 if no order is given.
   */
  order?: number;

  /**
   * If an action returns false or Promise<false> then the decorator action will not
   * be applied.  Note that undefined/void is treated as returning true (i.e. the
   * decorated action should be performed.
   */
  on?: (
    opts: TyrActionFnOpts<D>
  ) => void | boolean | Promise<void | boolean>;
  hide?: boolean | ((doc: D) => boolean);
}

let nextKey = 0;

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
  name?: string;
  labelValue:
    | string
    | React.ReactNode
    | ((opts: TyrActionFnOpts<D>) => string | React.ReactNode);
  renderVal?:
    | React.ReactNode
    | ((opts: TyrActionFnOpts<D>) => React.ReactNode);
  title: string | React.ReactNode;
  input: Cardinality;
  on?: (
    opts: TyrActionFnOpts<D>
  ) => void | boolean | Promise<void | boolean>;
  hide?: boolean | ((doc: D) => boolean);
  utility?: boolean;
  align?: 'left' | 'center' | 'right';
  order?: number;

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
    render,
    title,
    input,
    on,
    hide,
    utility,
    align,
    order,
  }: TyrActionOpts<D>) {
    this.traits = traits = traits || [];
    this.name = name;
    this.self = self;
    this.labelValue = label || (name && Tyr.labelize(name));
    this.renderVal = render;
    this.title = title || this.labelValue;
    this.on = on;
    this.input =
      input ?? (traits.includes('create') || traits.includes('search') || render ? 0 : 1);
    this.hide = hide;
    this.utility = utility;
    this.align = align;
    this.order = order;
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

  isLocal() {
    return !this.traits?.length;
  }

  isHidden(document?: D) {
    const { hide } = this;

    if (typeof hide === 'function') {
      return hide(document!);
    } else {
      return !!hide;
    }
  }

  wrappedFnOpts(opts: Partial<TyrActionFnOpts<D>>) {
    const wrapper = new TyrActionFnOptsWrapper<D>();
    Object.assign(wrapper, opts);
    wrapper.self = this.self as TyrComponent<D>;
    return wrapper;
  }

  act(opts: Partial<TyrActionFnOpts<D>>) {
    try {
      const { on } = this;

      on?.(this.wrappedFnOpts(opts) as any);
    } catch (err) {
      console.log(err);
      notification.error(err.message || 'Unknown error');
    }
  }

  private _key: string | undefined;
  get key() {
    const { name } = this;
    if (name) return `a_${this.name}`;
    let { _key } = this;
    if (!_key) _key = String(++nextKey);
    return _key;
  }

  get className() {
    const { name, traits } = this;

    let s = 'tyr-action'
    if (name) s += ' tyr-action-' + Tyr.kebabize(name);
    if (traits?.[0] === 'save' && name !== 'save') s += ' tyr-action-save';
    return s;
  }

  renderFrom(component: TyrComponent<any>) {
    const { renderVal, key } = this;

    if (renderVal) {
      return (
        <Fragment key={key}>{
          typeof renderVal === 'function'
            ? renderVal(this.wrappedFnOpts(component.actionFnOpts() as any) as any)
            : renderVal
        }</Fragment>
      );
    } else if (this.input === '*') {
      return (
        <Button
          key={key}
          className={this.className}
          disabled={!component.selectedIds?.length}
          onClick={() => this.act(component.actionFnOpts() as any)}
        >
          {this.label(component)}
        </Button>
      );
    } else {
      return (
        <Button
          key={key}
          className={this.className}
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
      on: this.on,
      hide: this.hide,
      input: this.input,
      utility: this.utility,
      align: this.align,
      order: this.order,
    };

    Object.assign(newOpts, opts);

    if (opts.on) {
      newOpts.on = (fnOpts: TyrActionFnOpts<D>) => {
        const result = this.on?.(fnOpts);

        switch (typeof result) {
          case 'undefined':
            opts.on!(fnOpts);
            break;
          case 'boolean':
            if (result) {
              opts.on!(fnOpts);
            }
            break;
          default:
            result.then(promisedResult => {
              if (promisedResult === undefined || promisedResult) {
                opts.on!(fnOpts);
              }
            });
        }
      };
    }

    return new TyrAction<D>(newOpts as any);
  }
}

export interface TyrActionBarProps<D extends Tyr.Document = Tyr.Document> {
  actions?: TyrAction<D>[];
  utility?: boolean;
  component: TyrComponent<D>;
  className?: string;
};

export function TyrActionBar<D extends Tyr.Document>({ actions: propsActions, utility, component, className }: TyrActionBarProps<D>) {
  const u = !utility;
  const actions = propsActions || component.actions.filter(
    a => !a.isExit() && a.input !== 1 && a.hide !== true && !a.utility === u
  );

  actions.sort((a, b) => Math.sign((a.order ?? 100) - (b.order ?? 100)));

  const leftActions = actions.filter(a => !a.align || a.align === 'left');
  const centerActions = actions.filter(a => a.align === 'center');
  const rightActions = actions.filter(a => a.align === 'right');

  const sectionCount = !!leftActions.length as any + !!centerActions.length  + !!rightActions.length;

  switch (sectionCount) {
    case 0:
      return <></>;
    case 1: 
      return (
        <Row>
          <Col span={24} className={'tyr-action-bar' + (className ? ' ' + className : '')}>
            {actions.map(a => a.renderFrom(component))}
          </Col>
        </Row>
      );
    default:
      return (
        <Row>
          <Col span={24} className={'tyr-action-bar tyr-sectioned' + (className ? ' ' + className : '')}>
            {leftActions.length > 0 && <div className="tyr-action-bar-section tyr-left">{leftActions.map(a => a.renderFrom(component))}</div>}
            {centerActions.length > 0 && <div className="tyr-action-bar-section tyr-center">{centerActions.map(a => a.renderFrom(component))}</div>}
            {rightActions.length > 0 && <div className="tyr-action-bar-section tyr-right">{rightActions.map(a => a.renderFrom(component))}</div>}
          </Col>
        </Row>
      );
  }
};
