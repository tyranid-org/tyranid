import * as React from 'react';

import { Tyr } from 'tyranid/client';

import {
  TyrAction,
  TyrActionFnOpts,
  TyrActionOpts,
  TyrActionTrait
} from './action';
import { TyrDecorator } from './decorator';
import { TyrFieldProps, TyrFieldLaxProps } from './field';

export const ComponentContext = React.createContext<TyrComponent | undefined>(
  undefined
);

export interface TyrComponentProps {
  collection?: Tyr.CollectionInstance;
  fields?: TyrFieldLaxProps[];
  decorator?: React.ReactElement;
  actions?: (TyrAction | TyrActionOpts)[];
}

export interface TyrComponentState {
  document?: Tyr.Document; // forms
  documents?: Tyr.Document[]; // tables
  visible?: boolean;
}

/**
 * A TyrComponent represents a react component that contains documents.  Examples
 * are TyrTable and TyrForm.
 */
export class TyrComponent<
  Props extends TyrComponentProps = TyrComponentProps,
  State extends TyrComponentState = TyrComponentState
> extends React.Component<Props, State> {
  collection?: Tyr.CollectionInstance;
  fields: TyrFieldProps[] = [];
  parent?: TyrComponent;
  children: TyrComponent[] = [];
  decorator?: TyrDecorator;
  _linkToParent?: any /* Field */;

  /**
   * A partial component is one that augments its parent object
   */
  partial = false;

  /**
   * Can this component edit documents?
   */
  canEdit = false;

  /**
   *  Can this component display multiple documents at once or only one?
   */
  canMultiple = false;

  constructor(props: Props, state: State) {
    super(props, state);

    this.collection = this.props.collection;
  }

  componentDidMount() {
    this.setState({ visible: true });

    if (!this.collection)
      throw new Tyr.AppError(
        'could not determine collection for Tyr.Component'
      );

    const props = this.props as Props;
    const actions = (props.actions || []).map(TyrAction.get);
    const { linkToParent } = this;

    //
    // Manually Added Actions
    //

    const manuallyAddedActions = actions.length > 0;
    for (const action of actions) {
      // TODO:  clone action if component is already defined?  (note: check if TyrAction.get() above created it)
      action.component = this;
      const actFn = action.action;

      if (!actFn && action.is('edit')) {
        action.action = opts => {
          this.find(opts.document!);

          if (!this.document)
            this.setState({ document: this.createDocument(opts) });
        };
      } else if (actFn && action.is('save')) {
        action.action = opts => {
          actFn({ ...opts, document: this.document });
        };
      }

      // TODO:  how do we know whether to enact locally or up ?  this check surely isn't right
      if (action.traits?.length) {
        this.enactUp(action);
      } else {
        this.enact(action);
      }
    }

    //
    // Automatically-Added Actions
    //

    const enactUp = (action: TyrActionOpts) => {
      const { traits } = action;
      action.component = this;

      const trait = traits?.[0];
      if (!trait || !actions.find(action => action.is(trait))) {
        action = TyrAction.get(action);
        actions.push(action as TyrAction);
        this.enactUp(action);
      }
    };

    enactUp({
      traits: ['cancel'],
      name: this.canEdit ? 'cancel' : 'done',
      action: opts => {}
    });

    if (this.canEdit && !linkToParent && !manuallyAddedActions) {
      enactUp({
        traits: ['create'],
        name: 'create',
        label: 'Create ' + this.collection.label,
        action: opts => this.setState({ document: this.createDocument(opts) })
      });
    }

    if (!this.canMultiple || linkToParent) {
      enactUp({
        traits: ['edit'],
        name: linkToParent
          ? this.canMultiple
            ? Tyr.pluralize(this.collection!.label)
            : this.collection!.label
          : 'edit',
        action: async opts => {
          await this.find(opts.document!);

          if (!this.document)
            this.setState({ document: this.createDocument(opts) });
        }
      });
    }

    if (this.canEdit) {
      enactUp({
        traits: ['save'],
        name: 'save',
        action: opts => this.submit()
      });
    }
  }

  actions: TyrAction[] = [];
  enact(action: TyrAction | TyrActionOpts) {
    const _action = TyrAction.get(action);

    const { actions } = this;

    for (let ai = 0; ai < actions.length; ai++) {
      const a = actions[ai];
      if (a.name === action.name && a.component === action.component) {
        actions[ai] = _action;
        return;
      }
    }

    this.actions.push(_action);
  }

  enactUp(action: TyrAction | TyrActionOpts) {
    const _action = TyrAction.get(action);

    const { decorator } = this;

    if (decorator) {
      decorator.enact(_action);
    } else {
      const { parent } = this;

      if (parent) parent.enact(_action);
    }
  }

  submit() {
    throw new Error('submit() not defined');
  }

  connect(parent?: TyrComponent): boolean | undefined | void {
    let collection: Tyr.CollectionInstance | undefined;
    let result: boolean | undefined;

    if (parent && !this.parent) {
      const { collection: propsCollection, fields: propsFields } = this.props;

      this.parent = parent;
      parent.children.push(this);

      const parentCollection = parent.collection;
      collection = this.collection = propsCollection || parentCollection;

      const fields =
        propsFields || (collection === parentCollection && parent.props.fields);

      if (fields) {
        this.fields = fields.map(laxFieldProps => {
          const fieldProps = Object.assign({}, laxFieldProps);
          const f = fieldProps.field;
          if (typeof f === 'string') {
            fieldProps.field = collection!.paths[f];
          }
          return fieldProps as TyrFieldProps;
        });
      }

      if (parentCollection !== collection && collection) {
        // find connecting link

        const { paths } = collection;
        for (const pathName in paths) {
          const field = paths[pathName];

          if (field.link === parentCollection) {
            this._linkToParent = field;
          }
        }
      }

      result = true;
    }

    return result;
  }

  /**
   * This creates a new document for this control that is related to the parent documents
   * according to how the component hierarchy.
   */
  createDocument(actionOpts: TyrActionFnOpts) {
    const { linkToParent } = this;

    const obj = {};

    if (linkToParent) {
      linkToParent.namePath.set(obj, actionOpts.document!.$id);
    }

    return new this.collection!(obj);
  }

  async refresh() {}

  async find(document: Tyr.Document) {
    const { collection, linkToParent } = this;
    let updatedDocument: Tyr.Document | null | undefined;

    if (!collection) throw new Error('no collection');

    if (linkToParent) {
      updatedDocument = await collection.findOne({
        query: {
          [linkToParent.namePath.spath]: document.$id
        }
      });
    } else {
      if (collection.id !== document.$model.id) {
        throw new Error('mismatched collection ids');
      }

      updatedDocument = await collection.byId(document.$id);
      if (!updatedDocument) {
        throw new Error('could not find document');
      }
    }

    if (updatedDocument) {
      this.setState({ document: updatedDocument });
    }
  }

  /**
   * This indicates that this component was created through a link Field on a parent component.
   *
   * i.e. if our component's collection is "OrderLineItem", our "linkToParent" might be "Order::lineItems"
   */
  get linkToParent(): any /* Field */ | undefined {
    return this._linkToParent;
  }

  get parentDocument(): Tyr.Document | undefined {
    const { parent } = this;

    if (parent) {
      const { document } = parent.state;

      if (document) {
        return document;
      }
    }

    //return undefined;
  }

  get document(): Tyr.Document | undefined {
    const { state } = this;

    if (state) {
      const { document } = state;
      if (document) return document;
    }

    //return undefined;
  }

  getDecoratorRef = (decorator: TyrDecorator | null) => {
    if (decorator) {
      this.decorator = decorator;
      decorator.connect(this);
    }
  };

  wrap(children: () => React.ReactNode) {
    const { decorator } = this.props;

    return (
      <ComponentContext.Consumer>
        {parent => {
          this.connect(parent);
          return (
            <ComponentContext.Provider value={this}>
              {decorator
                ? React.cloneElement(
                    decorator!,
                    { ref: this.getDecoratorRef },
                    children()
                  )
                : children()}
            </ComponentContext.Provider>
          );
        }}
      </ComponentContext.Consumer>
    );
  }
}
