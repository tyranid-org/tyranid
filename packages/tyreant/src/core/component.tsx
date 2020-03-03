import * as React from 'react';

import { observable, computed } from 'mobx';
import { observer } from 'mobx-react';

import { Tyr } from 'tyranid/client';

import { Filter } from './filter';
import { TyrAction, TyrActionFnOpts, TyrActionOpts } from './action';
import { TyrDecorator } from './decorator';
import { defaultPathsProp, TyrPathProps, TyrPathLaxProps } from './path';

export const ComponentContext = React.createContext<TyrComponent | undefined>(
  undefined
);

export const useComponent = () => React.useContext(ComponentContext);

export interface TyrComponentProps<D extends Tyr.Document = Tyr.Document> {
  className?: string;
  collection?: Tyr.CollectionInstance<D>;
  paths?: TyrPathLaxProps[];
  decorator?: React.ReactElement;
  actions?: (TyrAction<D> | TyrActionOpts<D>)[];
  aux?: { [key: string]: Tyr.FieldDefinition<D> };
}

export interface TyrComponentState<D extends Tyr.Document = Tyr.Document> {
  visible?: boolean;
}

/**
 * A TyrComponent represents a react component that contains documents.  Examples
 * are TyrTable and TyrForm.
 */
@observer
export class TyrComponent<
  D extends Tyr.Document = Tyr.Document,
  Props extends TyrComponentProps<D> = TyrComponentProps<D>,
  State extends TyrComponentState<D> = TyrComponentState<D>
> extends React.Component<Props, State> {
  collection!: Tyr.CollectionInstance<D>;
  paths!: TyrPathProps[];

  /**
   * "paths" contains all of the paths available to the component,
   * "activePaths" contains paths that are currently active on the screen
   *   (e.g. what paths are enabled in table configuration)
   */
  @computed
  get activePaths(): TyrPathProps[] {
    return this.paths;
  }

  parent?: TyrComponent;
  children: TyrComponent[] = [];
  decorator?: TyrDecorator<D>;
  _linkToParent?: any /* Field */;

  @observable
  loading = false;

  /**
   * Can this component edit documents?
   */
  canEdit = false;

  /**
   *  Can this component display multiple documents at once or only one?
   */
  canMultiple = false;

  hasPaging = false;

  /*
   * * * TyrOneComponent properties defined here for convenience in callbacks * * *
   */
  @observable
  document!: D;

  mounted = false;

  /*
   * * * TyrManyComponent properties defined here for convenience in callbacks * * *
   */

  get isLocal() {
    return false;
  }

  /**
   * if isLocal then this has *all* the data, otherwise it just has the current page
   */
  @observable
  documents: D[] & { count?: number } = [] as D[] & {
    count?: number;
  };

  constructor(props: Props, state: State) {
    super(props, state);

    const collection = (this.collection = this.props.collection!);

    const paths = this.props.paths;
    if (paths && collection)
      this.paths = paths.map(laxFieldProps =>
        this.resolveFieldLaxProps(laxFieldProps)
      );
    else if (collection) this.paths = defaultPathsProp(collection);
  }

  componentDidMount() {
    this.mounted = true;

    this.setState({ visible: true });

    if (!this.collection)
      throw new Tyr.AppError(
        'could not determine collection for Tyr.Component'
      );

    const props = this.props as Props;
    const actions = (props.actions || []).map(TyrAction.get) as TyrAction<D>[];
    const { linkToParent } = this;

    //
    // Manually Added Actions
    //

    const manuallyAddedActions = actions.length > 0;
    for (const action of actions) {
      // TODO:  clone action if component is already defined?  (note: check if TyrAction.get() above created it)
      action.self = this;
      const actFn = action.action;

      if (!actFn && action.is('edit')) {
        action.action = async opts => {
          if (action.input === '*') {
            const { documents } = opts;
            if (documents) this.documents = documents;

            if (opts.document) await this.find(opts.document);

            if (this.canEdit && !this.document) {
              const collection = Tyr.aux({ fields: this.props.aux }, this);
              this.document = new collection({});
            }
          } else {
            await this.find(opts.document!);

            if (!this.document) this.document = this.createDocument(opts);
          }
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

    const enactUp = (action: TyrActionOpts<D>) => {
      const { traits } = action;
      action.self = this;

      const trait = traits?.[0];
      if (!trait || !actions.find(action => action.is(trait))) {
        action = TyrAction.get(action) as TyrAction<D>;
        actions.push(action as TyrAction<D>);
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
        action: opts => {
          this.document = this.createDocument(opts);
        }
      });
    }

    if (!this.canMultiple || linkToParent) {
      const name = linkToParent ? this.collection!.label : 'edit';
      const title = 'Edit ' + this.collection!.label;

      enactUp({
        traits: ['edit'],
        name,
        title,
        action: async opts => {
          await this.find(opts.document!);

          if (!this.document) this.document = this.createDocument(opts);
        }
      });
    }

    if (this.canEdit) {
      enactUp({
        traits: ['save'],
        name: 'save',
        action: () => this.submit()
      });
    }
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  actions: TyrAction<D>[] = [];
  enact(action: TyrAction<D> | TyrActionOpts<D>) {
    const _action = TyrAction.get(action);

    const { actions } = this;

    for (let ai = 0; ai < actions.length; ai++) {
      const a = actions[ai];
      if (a.name === action.name && a.self === action.self) {
        actions[ai] = _action;
        return;
      }
    }

    this.actions.push(_action);
  }

  enactUp(action: TyrAction<D> | TyrActionOpts<D>) {
    const _action = TyrAction.get(action);

    const { decorator } = this;

    if (decorator) {
      decorator.enact(_action);
    } else {
      const { parent } = this;
      if (parent) parent.enact(_action as any);
    }
  }

  submit() {
    throw new Error('submit() not defined');
  }

  resolveFieldLaxProps(laxPathProps: TyrPathLaxProps) {
    const pathProps = Object.assign({}, laxPathProps);
    const p = pathProps.path;
    if (typeof p === 'string') pathProps.path = this.collection.parsePath(p);
    return pathProps as TyrPathProps;
  }

  // TODO:  if we switch to creating a HOC for class TyrComponents in order to pick up TyrThemes, also
  //        pick up the parent component and then move this connect() functionality to ComponentDidMount
  //        (or the constructor?) and get rid of the connect concept (and the wrap() as well?)
  //        though also need to account for connecting to the Decorator
  connect(parent?: TyrComponent): boolean | undefined | void {
    let collection: Tyr.CollectionInstance | undefined = this.props.collection;
    let result: boolean | undefined;

    if (parent && !this.parent) {
      this.parent = parent;
      parent.children.push(this as any);

      const parentCollection = parent.collection;
      if (!collection)
        collection = this.collection = parentCollection as Tyr.CollectionInstance<
          D
        >;

      let paths: TyrPathLaxProps[] | undefined = this.paths;
      if (!paths && collection) {
        paths = this.props.paths;
        if (!paths && collection === parentCollection)
          paths = parent.props.paths;

        if (paths)
          this.paths = paths.map(laxPathProps =>
            this.resolveFieldLaxProps(laxPathProps)
          );
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
  createDocument(actionOpts: TyrActionFnOpts<D>) {
    const { linkToParent } = this;

    const obj = {};

    if (linkToParent) {
      linkToParent.namePath.set(obj, actionOpts.document!.$id);
    }

    return new this.collection!(obj);
  }

  async refresh() {
    this.setState({});
  }

  async requery() {}

  /**
   * These are the options that were passed to the most recent query().
   *
   * This is useful if you want to query what the user was looking at in a server
   * method in a background worker.
   *
   * For example, the query is "table.findOpts.query".
   */
  findOpts?: any;

  async find(document: D) {
    const { collection, linkToParent } = this;
    let updatedDocument: D | null | undefined;

    if (!collection) throw new Error('no collection');

    if (linkToParent) {
      updatedDocument = (await collection.findOne({
        query: {
          [linkToParent.namePath.spath]: document.$id
        }
      })) as D;
    } else {
      if (collection.id !== document.$model.id) {
        throw new Error('mismatched collection ids');
      }

      updatedDocument = (await collection.byId(document.$id)) as D;
      if (!updatedDocument) {
        throw new Error('could not find document');
      }
    }

    if (updatedDocument) {
      this.document = updatedDocument;
      this.refresh();
    }
  }

  /**
   * This indicates that this component was created through a link Field on a parent component.
   *
   * i.e. if our component's collection is "OrderLineItem", our "linkToParent" might be "Order::lineItems"
   */
  get linkToParent(): Tyr.anny /* Field */ | undefined {
    return this._linkToParent;
  }

  get parentDocument(): Tyr.Document | undefined {
    const { parent } = this;

    if (parent) {
      const { document } = parent;

      if (document) {
        return document;
      }
    }

    //return undefined;
  }

  getDecoratorRef = (decorator: TyrDecorator<D> | null) => {
    if (decorator) {
      this.decorator = decorator;
      decorator.connect(this);
    }
  };

  getFilter(props: TyrPathProps): ReturnType<Filter> {
    return undefined;
  }

  wrap(children: () => React.ReactNode) {
    const { decorator } = this.props;

    return (
      <ComponentContext.Consumer>
        {parent => {
          this.connect(parent);
          return (
            <ComponentContext.Provider value={this as any}>
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
