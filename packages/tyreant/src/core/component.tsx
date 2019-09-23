import * as React from 'react';

import { Tyr } from 'tyranid/client';

import { TyrAction, TyrActionFnOpts } from './action';
import { TyrDecorator } from './decorator';
import { TyrFieldProps, TyrFieldLaxProps } from './field';

export const ComponentContext = React.createContext<TyrComponent | undefined>(
  undefined
);

export interface TyrComponentProps {
  collection?: Tyr.CollectionInstance;
  fields?: TyrFieldLaxProps[];
  decorator?: React.ReactElement;
  actions?: TyrAction[];
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
  partial: boolean = false;

  constructor(props: Props, state: State) {
    super(props, state);

    this.collection = this.props.collection;
  }

  componentDidMount() {
    this.setState({ visible: true });
  }

  actions: TyrAction[] = [];
  enact(action: TyrAction) {
    const { actions } = this;

    for (let ai = 0; ai < actions.length; ai++) {
      const a = actions[ai];
      if (a.name === action.name && a.component === action.component) {
        actions[ai] = action;
        return;
      }
    }

    this.actions.push(action);
  }

  enactUp(action: TyrAction) {
    const { decorator } = this;

    if (decorator) {
      decorator.enact(action);
    } else {
      const { parent } = this;

      if (parent) parent.enact(action);
    }
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
