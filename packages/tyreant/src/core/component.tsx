import * as React from 'react';

import { Tyr } from 'tyranid/client';

import { TyrAction } from './action';
import { TyrDecorator } from './decorator';
import { TyrModal } from './modal';

export const ComponentContext = React.createContext<TyrComponent | undefined>(
  undefined
);

export interface TyrComponentProps {
  collection?: Tyr.CollectionInstance;
  fields?: { field?: string }[];
  decorator?: string;
}

export interface TyrComponentState {
  document?: Tyr.Document; // forms
  documents?: Tyr.Document[]; // tables
  linkToParent?: any /* Field */;
}

export class TyrComponent<
  Props extends TyrComponentProps = TyrComponentProps,
  State extends TyrComponentState = TyrComponentState
> extends React.Component<Props, State> {
  collection?: Tyr.CollectionInstance;
  fields: Tyr.FieldInstance[] = [];
  parent?: TyrComponent;
  children: TyrComponent[] = [];
  decorator?: TyrDecorator;

  /**
   * A partial component is one that augments its parent object
   */
  partial: boolean = false;

  constructor(props: Props, state: State) {
    super(props, state);

    this.collection = this.props.collection;
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
        this.fields = (fields as { field?: string }[])
          .filter(f => !!f.field)
          .map(f => collection!.paths[f.field!]);
      }

      if (parentCollection !== collection && collection) {
        // find connecting link

        const { paths } = collection;
        for (const pathName in paths) {
          const field = paths[pathName];

          if (field.link === parentCollection) {
            this.setState({ linkToParent: field });
          }
        }
      }

      result = true;
    }

    const decoratorName = this.props.decorator;
    if (decoratorName && !this.decorator) {
      let decorator: TyrDecorator;

      switch (decoratorName) {
        case 'modal':
          decorator = new TyrModal();
          break;
        default:
          decorator = new TyrModal();
      }

      this.decorator = decorator;
      decorator.connect(this);
      result = true;
    }

    return result;
  }

  async find(document: Tyr.Document) {
    const { collection, linkToParent } = this;
    let updatedDocument: Tyr.Document | null | undefined;

    if (!collection) throw new Error('no collection');

    if (linkToParent) {
      updatedDocument = undefined;
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
    if (this.state) {
      const { linkToParent } = this.state;
      if (linkToParent) return linkToParent;
    }

    //return undefined;
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

  wrap(children: () => React.ReactNode) {
    const { decorator } = this;

    return (
      <ComponentContext.Consumer>
        {parent => {
          this.connect(parent);
          return (
            <ComponentContext.Provider value={this}>
              {decorator ? decorator.wrap(children) : children()}
            </ComponentContext.Provider>
          );
        }}
      </ComponentContext.Consumer>
    );
  }
}
