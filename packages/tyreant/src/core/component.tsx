import * as React from 'react';

import { observable } from 'mobx';
import { observer } from 'mobx-react';

import { Tyr } from 'tyranid/client';

import { Filter } from './filter';
import {
  TyrAction,
  TyrActionFnOpts,
  TyrActionOpts,
  ActionSet,
  TyrActionTrait
} from './action';
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
  actions?: ActionSet<D>;
  aux?: { [key: string]: Tyr.FieldDefinition<D> };
  parent?: TyrComponent;
  linkFromParent?: string;
  linkToParent?: string;
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

      this.setupLink();
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

  actionFnOpts(): TyrActionFnOpts<D> {
    return { caller: this } as any;
  }

  componentDidMount() {
    this.mounted = true;
    this.visible = true;

    const props = this.props as Props;
    const { aux } = props;

    let collection = this.collection;

    if (aux) {
      if (!collection) {
        this.collection = collection = Tyr.aux(
          { fields: aux },
          this
        ) as Tyr.CollectionInstance<D>;
      } else {
        collection.aux(aux);
      }
    }

    if (!collection)
      throw new Tyr.AppError(
        'could not determine collection for Tyr.Component'
      );

    const actions = TyrAction.parse(props.actions as ActionSet<D>);

    const { linkToParent, linkFromParent } = this;
    const parentLink = linkToParent || linkFromParent;

    //
    // Set up Actions
    //

    const enacted = (trait: TyrActionTrait) => actions.some(a => a.is(trait));

    const enactUp = (_action: TyrActionOpts<D>) => {
      // TODO:  clone action if self is already defined?
      const action = TyrAction.get(_action) as TyrAction<D>;
      action.self = this;

      let actFn = action.action;

      if (!actFn) {
        if (action.is('edit', 'view')) {
          if (this.canMultiple && parentLink) {
            actFn = opts => {
              opts.self._parentDocument = opts.document;
              opts.self.requery();
            };
          } else if (action.input === '*' || action.input === '0..*') {
            actFn = async opts => {
              const { documents } = opts;
              if (documents) this.documents = documents;

              if (opts.document) await this.find(opts.document);

              if (this.canEdit && !this.document) {
                this.document = new collection({});
              }
            };
          } else {
            actFn = async opts => {
              await this.find(opts.document!);
              if (!this.document) this.document = this.createDocument(opts);
            };
          }
        } else if (action.is('create')) {
          actFn = opts => {
            this.document = this.createDocument(opts);
          };
        } else if (action.is('cancel')) {
          actFn = () => {};
        } else if (action.is('save')) {
          actFn = () => this.submit();
        }

        action.action = actFn;
      }

      if (action.is('save')) {
        // is this needed?
        action.action = opts => {
          actFn!({ ...opts, document: this.document });
        };
      }

      // TODO:  do we ever want to enact() locally on this component or always up?
      //        (save/cancel need to be enacted up so that the decorator sees it)
      this.enactUp(action);
    };

    // Manual Actions

    for (const action of actions) enactUp(action);

    // Automatic Actions

    if (this.canEdit && !parentLink && !enacted('create') && !enacted('view')) {
      enactUp({
        traits: ['create'],
        name: 'create',
        label: 'Create ' + collection.label
      });
    }

    if (!enacted('view') && !enacted('edit')) {
      enactUp({
        name: parentLink ? collection.label : 'edit',
        traits: ['edit'],
        title: !this.canMultiple
          ? 'Edit ' + collection.label
          : Tyr.pluralize(collection.label)
      });
    }

    const addingSave = this.canEdit && !enacted('view');

    if (!enacted('cancel')) {
      enactUp({
        traits: ['cancel'],
        name: enacted('save') || addingSave ? 'cancel' : 'close'
      });
    }

    if (addingSave) {
      enactUp({
        traits: ['save'],
        name: 'save'
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
    const { collection, linkToParent, linkFromParent } = this;
    let updatedDocument: D | null | undefined;

    if (!collection) throw new Error('no collection');

    if (linkToParent) {
      updatedDocument = (await collection.findOne({
        query: {
          [linkToParent.namePath.spath]: document.$id
        }
      })) as D;
    } else if (linkFromParent) {
      const id = linkFromParent.namePath.get(document);

      updatedDocument = (await collection.findOne({
        _id: id
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
  // Parent Linking
  //

  parent?: TyrComponent;

  /**
   * This indicates that this component was created through a link Field on a child component.
   *
   * i.e. if our component's collection is "OrderLineItem", our "linkToParent" might be "OrderLineItem::orderId"
   */
  linkToParent?: Tyr.FieldInstance<any>;

  /**
   * This indicates that this component was created through a link Field on a parent component.
   *
   * i.e. if our component's collection is "OrderLineItem", our "linkToParent" might be "Order::lineItems"
   *
   * Only one of linkToParent or linkFromParent can be set at one time -- they are mutually exclusive.
   */
  linkFromParent?: Tyr.FieldInstance<any>;

  setupLink() {
    const { collection, parent, props } = this;
    if (!parent) return;

    const parentCollection = parent.collection;

    const {
      linkToParent: propsLinkToParent,
      linkFromParent: propsLinkFromParent
    } = props;

    if (propsLinkToParent) {
      this.linkToParent = collection.paths[propsLinkToParent as string];

      if (!this.linkToParent)
        throw new Tyr.AppError(
          `linkToParent "${propsLinkToParent}" not found on ${collection.name}`
        );

      return;
    }

    if (propsLinkFromParent) {
      this.linkFromParent =
        parentCollection.paths[propsLinkFromParent as string];

      if (!this.linkFromParent)
        throw new Tyr.AppError(
          `linkFromParent "${propsLinkFromParent}" not found on ${parentCollection.name}`
        );

      return;
    }

    /*
     * Tyranid cannot currently automatically determine a recursive link between two collections
     * because usually when parentCollection === collection it means that the parent and child
     * are working with the SAME document.  So you currently need to use the linkToParent/linkFromParent
     * properties on the component in this case.
     */
    if (parentCollection === collection) return;

    // first try to find a link from the child to the parent

    let paths: { [pathName: string]: Tyr.FieldInstance<any> } =
      collection.paths;
    for (const pathName in paths) {
      const field = paths[pathName];

      if (field.link === parentCollection) {
        this.linkToParent = field;
        return;
      }
    }

    // next try to find a link from the parent to the child

    paths = parentCollection.paths;
    for (const pathName in paths) {
      const field = paths[pathName];

      if (field.link === collection) {
        this.linkFromParent = field;
        return;
      }
    }
  }

  _parentDocument?: Tyr.Document<any>;

  /**
   * Note that this is NOT usually the same as "this.parent.document".  For example,
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
