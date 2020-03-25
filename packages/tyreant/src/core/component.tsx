import * as React from 'react';

import { observable } from 'mobx';
import { observer } from 'mobx-react';

import { Tyr } from 'tyranid/client';

import { Filter } from './filter';
import { TyrAction, TyrActionFnOpts, TyrActionOpts } from './action';
import { TyrDecorator } from './decorator';
import { defaultPathsProp, TyrPathProps, TyrPathLaxProps } from './path';
import { TyrModal } from './modal';

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
  parent?: TyrComponent;
}

export interface TyrComponentState<D extends Tyr.Document = Tyr.Document> {}

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

  get displayName() {
    return this.constructor.name + ':' + this.collection.name;
  }

  /**
   * "paths" contains all of the paths available to the component,
   * "activePaths" contains paths that are currently active on the screen
   *   (e.g. what paths are enabled in table configuration)
   */
  get activePaths(): TyrPathProps[] {
    return this.paths;
  }

  children: TyrComponent[] = [];
  decorator?: TyrDecorator<D>;

  @observable
  loading = false;

  @observable
  visible = false;

  mounted = false;

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

  /*
   * * * TyrManyComponent properties defined here for convenience in callbacks * * *
   */

  get isLocal() {
    return false;
  }

  refreshPaths() {
    if (this.props.paths) {
      this.paths = this.props.paths.map(laxFieldProps =>
        this.resolveFieldLaxProps(laxFieldProps)
      );
    }
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

    const { parent, paths } = props;
    let { collection } = props;

    if (parent && !collection)
      collection = parent.collection as Tyr.CollectionInstance<D>;

    this.collection = collection!;

    if (paths && collection) this.refreshPaths();
    else if (collection) this.paths = defaultPathsProp(collection);

    if (parent) {
      this.parent = parent;
      parent.children.push(this as any);

      const parentCollection = parent.collection;

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
            break;
          }
        }
      }
    }
  }

  /*
  // this is very useful to track down when there is an infinite re-render cycle
  componentDidUpdate(prevProps: any, prevState: any) {
    Object.entries(this.props).forEach(
      ([key, val]) =>
        prevProps[key] !== val && console.log(`Prop '${key}' changed from`, prevProps[key], ' to ', val)
    );
    if (this.state && prevState) {
      Object.entries(this.state).forEach(
        ([key, val]) =>
          prevState[key] !== val && console.log(`State '${key}' changed`)
      );
    }
  }
  */

  componentDidMount() {
    this.mounted = true;
    this.visible = true;

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
              const collection = Tyr.aux(
                { fields: this.props.aux },
                this
              ) as Tyr.CollectionInstance<D>;
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

    if (linkToParent) {
      if (!this.canMultiple) {
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
      } else {
        const name = linkToParent ? this.collection!.label : 'edit';

        enactUp({
          traits: ['edit'],
          input: 1,
          name,
          label: Tyr.pluralize(this.collection!.label),
          action: opts => {
            opts.self._parentDocument = opts.document;
            opts.self.requery();
          }
        });
      }
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
    this.descendantWillUnmount(this);
  }

  descendantWillUnmount(component: TyrComponent<any>) {
    const { actions } = this;
    for (let i = 0; i < actions.length; )
      if (actions[i].self === component) actions.splice(i, 1);
      else i++;

    this.parent?.descendantWillUnmount(component);
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
    this.refresh();
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
    let p = pathProps.path;
    if (typeof p === 'string') pathProps.path = this.collection.parsePath(p);

    p = pathProps.searchPath;
    if (typeof p === 'string')
      pathProps.searchPath = this.collection.parsePath(p);

    return pathProps as TyrPathProps;
  }

  /**
   * This creates a new document for this control that is related to the parent documents
   * according to how the component hierarchy is laid out.
   */
  createDocument(actionOpts: TyrActionFnOpts<D>) {
    const { linkToParent, parent } = this;

    const doc = new this.collection!({});

    if (parent) {
      if (parent.collection === this.collection && parent.canMultiple) {
        const { parentDocument, linkToParent } = parent;

        if (parentDocument && linkToParent)
          linkToParent.namePath.set(doc, parentDocument.$id);
      } else if (linkToParent) {
        linkToParent.namePath.set(doc, actionOpts.document!.$id);
      }
    }

    return doc;
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
  findOpts?: any; // Tyr.FindAllOptions

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

  //
  // Parent
  //

  parent?: TyrComponent;

  _linkToParent?: Tyr.FieldInstance<any>;

  /**
   * This indicates that this component was created through a link Field on a parent component.
   *
   * i.e. if our component's collection is "OrderLineItem", our "linkToParent" might be "Order::lineItems"
   */
  get linkToParent(): Tyr.FieldInstance<any> | undefined {
    return this._linkToParent;
  }

  _parentDocument?: Tyr.Document<any>;

  /**
   * Note that this is *not* usually the same as "this.parent.document".  For example,
   * if the parent component is a Table, this.parent.document will be undefined,
   * this.parent.documents will have the list of documents and this.parentDocument
   * will be the selected parent document.
   */
  get parentDocument(): Tyr.Document | undefined {
    const { _parentDocument } = this;
    if (_parentDocument) return _parentDocument;

    const { parent } = this;
    if (parent) {
      const { document } = parent;
      if (document) return document;
    }

    //return undefined;
  }

  setDecoratorRef = (decorator: TyrDecorator<D>) => {
    this.decorator = decorator;
  };

  getFilter(props: TyrPathProps): ReturnType<Filter> {
    return undefined;
  }

  wrap(children: () => React.ReactNode) {
    const { parent, decorator } = this.props;

    const Modal = TyrModal as any;

    return (
      <ComponentContext.Provider value={this as any}>
        {decorator ? (
          React.cloneElement(decorator!, {}, children())
        ) : parent ? (
          <Modal className="tyr-wide-modal">{children()}</Modal>
        ) : (
          children()
        )}
      </ComponentContext.Provider>
    );
  }
}
