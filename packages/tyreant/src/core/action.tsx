import * as React from 'react';
import { Fragment } from 'react';
import { Button, Col, Row, notification, Tooltip } from 'antd';

import { Tyr } from 'tyranid/client';

import type { TyrComponent } from './component';
import { isEntranceTrait, isExitTrait } from './trait';
import { TyrFilters } from '.';
import { isNonLocalTrait } from '../tyreant';
import { MenuOutlined } from '@ant-design/icons';

export type ActionSet<D extends Tyr.Document> =
  | { [actionName: string]: TyrAction<D> | TyrActionOpts<D> }
  | (TyrAction<D> | TyrActionOpts<D>)[];

export type actionPropsThatCanBeCallbacks =
  | 'hide'
  | 'href'
  | 'label'
  | 'on'
  | 'render'
  | 'title';

export const getActionSetValue = (
  set: ActionSet<any> | undefined,
  actionName: string,
  propName: actionPropsThatCanBeCallbacks
): any => {
  if (Array.isArray(set)) {
    return set?.find(action => action.name === actionName)?.[propName];
  } else {
    return set?.[actionName]?.[propName];
  }
};

export interface TyrActionFnOpts<D extends Tyr.Document> {
  self: TyrComponent<D>;

  /**
   * For example, for an edit action defined on a form which is invoked  by a table,
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

  /**
   * if action.input === 1
   */
  store: { [name: string]: any };
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

  get store() {
    return this.self.store;
  }
}

export type Cardinality = 0 | 1 | '0..*' | '*';

export interface TyrActionOpts<D extends Tyr.Document> {
  traits?: Tyr.ActionTrait[];
  trait?: Tyr.ActionTrait;
  name?: string;
  self?: TyrComponent<D>;
  label?:
    | string
    | React.ReactNode
    | ((opts: TyrActionFnOpts<D>) => string | React.ReactNode);
  render?: React.ReactNode | ((opts: TyrActionFnOpts<D>) => React.ReactNode);
  title?:
    | string
    | React.ReactNode
    | ((opts: TyrActionFnOpts<D>) => string | React.ReactNode);
  input?: Cardinality;
  href?:
    | string
    | React.ReactNode
    | ((opts: TyrActionFnOpts<D>) => string | React.ReactNode);
  target?: string;

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
  on?: (opts: TyrActionFnOpts<D>) => void | boolean | Promise<void | boolean>;
  hide?:
    | boolean
    | undefined
    | ((opts: TyrActionFnOpts<D>) => boolean | undefined);
}

let nextKey = 0;

export class TyrAction<D extends Tyr.Document = Tyr.Document> {
  static get<D extends Tyr.Document = Tyr.Document>(
    action: TyrAction<D> | TyrActionOpts<D>,
    component?: TyrComponent<D>
  ) {
    if (action instanceof TyrAction) return action;

    if (component) {
      const themeAction = component.props.theme?.action;

      if (
        action.traits?.some(isEntranceTrait) ||
        (action.trait && isEntranceTrait(action.trait))
      )
        component = component.parent as TyrComponent<any>;

      const actionTheme = component?.props.actionTheme;
      if (themeAction || actionTheme)
        action = {
          ...themeAction,
          ...actionTheme,
          ...action,
        };
    }

    if (action.trait === 'cancel' && !action.order) action.order = 0;

    return new TyrAction<D>(action as any);
  }

  static parse<D extends Tyr.Document = Tyr.Document>(
    obj: ActionSet<D>,
    component?: TyrComponent<D>
  ): TyrAction<D>[] {
    if (!obj) {
      return [];
    } else if (Array.isArray(obj)) {
      return obj.map(o => TyrAction.get(o, component));
    } else {
      const actions: TyrAction<D>[] = [];

      for (const name in obj) {
        actions.push(
          TyrAction.get(
            {
              ...obj[name],
              name,
            },
            component
          )
        );
      }

      return actions;
    }
  }

  static merge<D extends Tyr.Document = Tyr.Document>(
    base: ActionSet<D>,
    override: ActionSet<D>
  ): TyrAction<D>[] {
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

  /**
   * POSSIBLE TODO:  update actions in a getDerivedStateFromProps()
   *
   *                 would need to make sure actions passed out to (usually child)
   *                 components are valid as well though
   */
  getCurrentValue<T>(
    component: TyrComponent,
    propName: actionPropsThatCanBeCallbacks,
    value: T
  ) {
    const { name, self } = this;

    if (name && self) {
      const newValue = getActionSetValue(
        component.props.actions,
        name,
        propName
      ) as T;
      // value could be from a theme in which case we won't find it in the local props
      if (newValue !== undefined) return newValue;
    }

    return value;
  }

  evaluate<T>(
    component: TyrComponent,
    propName: actionPropsThatCanBeCallbacks,
    value: T,
    opts?: Partial<TyrActionFnOpts<D>>
  ) {
    value = this.getCurrentValue(component, propName, value);
    return typeof value === 'function'
      ? value.bind(this)(this.wrappedFnOpts(opts))
      : value;
  }

  traits: Tyr.ActionTrait[];
  name?: string;
  label:
    | string
    | React.ReactNode
    | ((opts: TyrActionFnOpts<D>) => string | React.ReactNode);
  render?: React.ReactNode | ((opts: TyrActionFnOpts<D>) => React.ReactNode);
  title:
    | string
    | React.ReactNode
    | ((opts: TyrActionFnOpts<D>) => string | React.ReactNode);
  input: Cardinality;
  href?:
    | string
    | React.ReactNode
    | ((opts: TyrActionFnOpts<D>) => string | React.ReactNode);
  target?: string;
  on?: (opts: TyrActionFnOpts<D>) => void | boolean | Promise<void | boolean>;
  hide?:
    | boolean
    | undefined
    | ((opts: TyrActionFnOpts<D>) => boolean | undefined);
  utility?: boolean;
  align?: 'left' | 'center' | 'right';
  /**
   * This should be a number between 0 and 100.  0 means "beginning/left" and 100 means "end/right".
   *
   * The default value is 50.
   */
  order?: number;

  /**
   * This is the component the action was defined on.
   */
  self?: TyrComponent<D>;

  get displayName() {
    const { self } = this;
    return this.name + ':' + (self?.displayName || 'no-self');
  }

  labelFor(component: TyrComponent): string | React.ReactNode {
    return this.evaluate(component, 'label', this.label);
  }

  titleFor(component: TyrComponent): string | React.ReactNode {
    return this.evaluate(component, 'title', this.title);
  }

  constructor({
    traits,
    trait,
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
    href,
    target,
  }: TyrActionOpts<D>) {
    this.traits = traits = traits || [];
    if (trait) this.traits.push(trait);
    this.name = name;
    this.self = self;
    this.label = label || (name && Tyr.labelize(name));
    this.render = render;
    this.title = title || this.label;
    this.on = on;
    this.input =
      input ??
      (traits.includes('create') ||
      traits.includes('search') ||
      traits.includes('cancel') ||
      render
        ? 0
        : 1);
    this.hide = hide;
    this.utility = utility;
    this.align = align;
    this.order = order;
    this.href = href;
    this.target = target;
  }

  is(...traits: Tyr.ActionTrait[]) {
    for (const trait of traits) {
      if (this.traits?.indexOf(trait) >= 0) return true;
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
    return !this.traits?.some(isNonLocalTrait);
  }

  isHidden(document?: D) {
    const v = this.evaluate(
      this.self as any,
      'hide',
      this.hide,
      document && { document }
    );
    return v === undefined ? false : !!v;
  }

  wrappedFnOpts(opts?: Partial<TyrActionFnOpts<D>>) {
    const wrapper = new TyrActionFnOptsWrapper<D>();
    const { self } = this;

    if (opts) {
      Object.assign(wrapper, opts);
      wrapper.self = self as TyrComponent<D>;
    } else {
      Object.assign(wrapper, self!.actionFnOpts());
    }
    return wrapper as TyrActionFnOpts<D>;
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

    let s = 'tyr-action';
    if (name) s += ' tyr-action-' + Tyr.kebabize(name);
    if (traits?.[0] === 'save' && name !== 'save') s += ' tyr-action-save';
    return s;
  }

  renderFor(
    component: TyrComponent<any>,
    actionFnOpts?: Partial<TyrActionFnOpts<any>>
  ) {
    const { render, key } = this;

    const opts = () =>
      actionFnOpts
        ? { ...(component.actionFnOpts() as any), ...actionFnOpts }
        : (component.actionFnOpts() as any);

    if (render) {
      return (
        <Fragment key={key}>
          {this.evaluate(component, 'render', render)}
        </Fragment>
      );
    } else if (this.traits.includes('filter')) {
      if (component.props.filter !== false) {
        return <TyrFilters key="action-filters" component={component} />;
      }
    } else if (this.traits.includes('config')) {
      if (component.props.config !== false) {
        return (
          <Tooltip title="Edit Configuration" key="action-config">
            <MenuOutlined
              className="tyr-component-config-icon"
              onClick={() => component.onClickConfig()}
            />
          </Tooltip>
        );
      }
    } else if (this.href) {
      const { href } = this;

      return (
        <a
          key={key}
          className={this.className}
          href={this.evaluate(component, 'href', href)}
          role="button"
          target={this.target ?? '_blank'}
        >
          {this.labelFor(component)}
        </a>
      );
    } else if (this.input === '*') {
      return (
        <Button
          key={key}
          className={this.className}
          disabled={!component.selectedIds?.length}
          onClick={() => this.act(opts())}
        >
          {this.labelFor(component)}
        </Button>
      );
    } else {
      return (
        <Button
          key={key}
          className={this.className}
          onClick={() => this.act(opts())}
        >
          {this.labelFor(component)}
        </Button>
      );
    }
  }

  decorate(opts: Partial<TyrActionOpts<D>>) {
    const newOpts: TyrActionOpts<D> = {
      traits: this.traits,
      name: this.name,
      label: this.label,
      title: this.titleFor,
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
            return opts.on!(fnOpts);
          case 'boolean':
            if (result) {
              return opts.on!(fnOpts);
            }
            break;
          default:
            return result.then(promisedResult => {
              if (promisedResult === undefined || promisedResult) {
                return opts.on!(fnOpts);
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
}

export function TyrActionBar<D extends Tyr.Document>({
  actions: propsActions,
  utility,
  component,
  className,
}: TyrActionBarProps<D>) {
  const u = !utility;
  let actions =
    propsActions ||
    component.actions.filter(
      a => !a.isExit() && a.input !== 1 && a.hide !== true && !a.utility === u
    );

  const { mode } = component.props;
  if (mode) actions = actions.filter(a => mode !== 'view' || !a.is('save'));

  actions.sort((a, b) => {
    let v = Math.sign((a.order ?? 50) - (b.order ?? 50));
    if (v === 0) v = a.name?.localeCompare(b.name ?? '') ?? 0;
    return v;
  });

  const leftActions = actions.filter(a => !a.align || a.align === 'left');
  const centerActions = actions.filter(a => a.align === 'center');
  const rightActions = actions.filter(a => a.align === 'right');

  const sectionCount =
    (!!leftActions.length as any) +
    !!centerActions.length +
    !!rightActions.length;

  const { document } = component;

  switch (sectionCount) {
    case 0:
      return <></>;
    case 1:
      return (
        <Row>
          <Col
            span={24}
            className={
              'tyr-action-bar' +
              (className ? ' ' + className : '') +
              (centerActions.length
                ? ' tyr-center'
                : rightActions.length
                ? ' tyr-right'
                : '')
            }
          >
            {actions
              .map(a =>
                a.isHidden(document) ? undefined : a.renderFor(component)
              )
              .filter(a => !!a)}
          </Col>
        </Row>
      );
    default:
      return (
        <Row>
          <Col
            span={24}
            className={
              'tyr-action-bar tyr-sectioned' +
              (className ? ' ' + className : '')
            }
          >
            {leftActions.length > 0 && (
              <div className="tyr-action-bar-section tyr-left">
                {leftActions
                  .map(a =>
                    a.isHidden(document) ? undefined : a.renderFor(component)
                  )
                  .filter(a => !!a)}
              </div>
            )}
            {centerActions.length > 0 && (
              <div className="tyr-action-bar-section tyr-center">
                {centerActions
                  .map(a =>
                    a.isHidden(document) ? undefined : a.renderFor(component)
                  )
                  .filter(a => !!a)}
              </div>
            )}
            {rightActions.length > 0 && (
              <div className="tyr-action-bar-section tyr-right">
                {rightActions
                  .map(a =>
                    a.isHidden(document) ? undefined : a.renderFor(component)
                  )
                  .filter(a => !!a)}
              </div>
            )}
          </Col>
        </Row>
      );
  }
}
