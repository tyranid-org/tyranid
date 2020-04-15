import * as React from 'react';

import { observable } from 'mobx';
import { observer } from 'mobx-react';

import { Tyr } from 'tyranid/client';

import { Filter } from './filter';
import { isEntranceTrait } from './trait';
import { TyrAction, TyrActionFnOpts, TyrActionOpts, ActionSet } from './action';
import { TyrDecorator } from './decorator';
import {
  defaultPathsProp,
  TyrPathProps,
  TyrPathLaxProps,
  getPathName,
} from './path';
import { TyrModal } from './modal';
import { TyrSortDirection } from './typedef';
import { TyrPanel } from './panel';
import { TyrThemeProps } from './theme';

export const ComponentContext = React.createContext<TyrComponent | undefined>(
  undefined
);

export const useComponent = () => React.useContext(ComponentContext);

export interface TyrComponentProps<D extends Tyr.Document = Tyr.Document> {
  className?: string;

  theme?: TyrThemeProps;

  // QUERYING
  collection?: Tyr.CollectionInstance<D>;

  // PATHS
  paths?: (TyrPathLaxProps<D> | string)[];
  aux?: { [key: string]: Tyr.FieldDefinition<D> };

  // DECORATORS
  decorator?: React.ReactElement;

  // ACTIONS
  traits?: Tyr.ActionTrait[];
  actions?: ActionSet<D>;

  // PARENT LINKING
  parent?: TyrComponent;
  linkFromParent?: string;
  linkToParent?: string;
}

export interface TyrComponentState<D extends Tyr.Document = Tyr.Document> {}

/**
 * A TyrComponent represents a react component that contains documents.  Examples
 * are TyrTable, TyrForm, TyrKanBan, and so on.
 */
@observer
export class TyrComponent<
  D extends Tyr.Document = Tyr.Document,
  Props extends TyrComponentProps<D> = TyrComponentProps<D>,
  State extends TyrComponentState<D> = TyrComponentState<D>
> extends React.Component<Props, State> {
  collection!: Tyr.CollectionInstance<D>;

  componentName = '';

  get displayName() {
    return this.constructor.name + ':' + this.collection.name;
  }

  @observable
  loading = false;

  @observable
  visible = false;

  mounted = false;

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

      let paths: (TyrPathLaxProps<D> | string)[] | undefined = this.paths;
      if (!paths && collection) {
        paths = this.props.paths;
        if (!paths && collection === parentCollection)
          paths = parent.props.paths as any;

        if (paths)
          this.paths = paths.map(laxPathProps =>
            this.resolveFieldLaxProps(laxPathProps)
          );
      }

      this.setupParentLink();
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

    this.setupActions();
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

  /*
   * * * PATHS
   */

  paths!: TyrPathProps<D>[];

  /**
   * "paths" contains all of the paths available to the component,
   * "activePaths" contains paths that are currently active on the screen
   *   (e.g. what paths are enabled in table configuration)
   */
  get activePaths(): TyrPathProps<D>[] {
    return this.paths;
  }

  refreshPaths() {
    if (this.props.paths) {
      this.paths = this.props.paths.map(laxFieldProps =>
        this.resolveFieldLaxProps(laxFieldProps)
      );
    }
  }

  resolveFieldLaxProps(laxPathProps: TyrPathLaxProps<D> | string) {
    const { theme } = this.props;
    const { collection } = this;

    const pathName = getPathName(laxPathProps);

    const pathProps: TyrPathLaxProps<D> = {};
    if (collection && pathName) {
      const themeProps =
        theme?.collections?.[collection.name]?.paths?.[pathName];
      if (themeProps) Object.assign(pathProps, themeProps);

      if (typeof laxPathProps === 'string') {
        pathProps.path = laxPathProps;
      } else {
        Object.assign(pathProps, laxPathProps);
      }
    }

    let p = pathProps.path;
    if (typeof p === 'string')
      p = pathProps.path = this.collection.parsePath(p);

    if (p) {
      // TODO:  handle multiple groups
      if (p.groupCount && !pathProps.group) {
        pathProps.group = p.groupLabel(0);
      }
    }

    p = pathProps.searchPath;
    if (typeof p === 'string')
      pathProps.searchPath = this.collection.parsePath(p);

    return pathProps as TyrPathProps<D>;
  }

  /*
   * * * DOCUMENTS
   */

  /**
   * Can this component edit documents?
   */
  canEdit = false;

  /**
   *  Can this component display multiple documents at once or only one?
   */
  canMultiple = false;

  @observable
  document!: D;

  /**
   * if isLocal then this has *all* the data, otherwise it just has the current page
   */
  @observable
  documents: D[] & { count?: number } = [] as D[] & {
    count?: number;
  };

  count?: number;

  async submit(): Promise<boolean> {
    throw new Error('submit() not defined');
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
          linkToParent.path.set(doc, parentDocument.$id);
      } else if (linkToParent) {
        linkToParent.path.set(doc, actionOpts.document!.$id);
      }
    }

    return doc;
  }

  /*
   * * * QUERYING
   */

  get isLocal() {
    return false;
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
    // TODO:  move this logic to OneComponent?
    const { collection, linkToParent, linkFromParent } = this;
    let updatedDocument: D | null | undefined;

    if (!collection) throw new Error('no collection');

    if (linkToParent) {
      updatedDocument = (await collection.findOne({
        query: {
          [linkToParent.path.spath]: document.$id,
        },
      })) as D;
    } else if (linkFromParent) {
      const id = linkFromParent.path.get(document);

      updatedDocument = (await collection.findOne({
        _id: id,
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

  /*
   * * * PARENT LINKING
   */

  parent?: TyrComponent;
  children: TyrComponent[] = [];

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

  setupParentLink() {
    const { collection, parent, props } = this;
    if (!parent) return;

    const parentCollection = parent.collection;

    const {
      linkToParent: propsLinkToParent,
      linkFromParent: propsLinkFromParent,
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

  /*
   * * * SELECTION
   */

  @observable
  selectedIds: string[] = [];

  /*
   * * * ACTIONS
   */

  actions: TyrAction<D>[] = [];

  /**
   * This is the action we entered this component with up ... it is an "entrance" action.
   */
  parentAction: TyrAction<D> | undefined;

  get isSearching() {
    return this.parentAction?.is('search') ?? false;
  }

  private enactLocal(action: TyrAction<D>) {
    const { actions } = this;

    for (let ai = 0; ai < actions.length; ai++) {
      const a = actions[ai];
      if (a.name === action.name && a.self === action.self) {
        actions[ai] = action;
        return;
      }
    }

    this.actions.push(action);
    this.refresh();
  }

  enact(action: TyrAction<D> | TyrActionOpts<D>) {
    let a = TyrAction.get(action);

    if (!a.isLocal()) {
      const { decorator } = this;
      if (decorator) a = decorator.enact(a);
    }

    if (a.isEntrance()) {
      this.parent?.enactLocal(a as TyrAction<any>);
    } else {
      this.enactLocal(a);
    }
  }

  actionFnOpts(): TyrActionFnOpts<D> {
    return {
      caller: this,
      document: this.document,
      documents: this.selectedIds.map(
        id => this.collection!.byIdIndex[id]
      ) as D[],
    } as any;
  }

  setupActions() {
    const { collection, props } = this;
    const actions = TyrAction.parse(props.actions as ActionSet<D>);

    const { parent, linkToParent, linkFromParent } = this;
    const parentLink = linkToParent || linkFromParent;

    let createAction: TyrAction<D> | undefined;
    let searchAction: TyrAction<D> | undefined;

    const { traits } = this.props;
    const enacted = (trait: Tyr.ActionTrait) => actions.some(a => a.is(trait));
    const enactedEntrance = () =>
      actions.some(a => isEntranceTrait(a.traits[0]));

    const auto = (trait: Tyr.ActionTrait) => {
      if (enacted(trait)) return false;
      let def = true;

      switch (trait) {
        case 'import':
        case 'export':
          return false;

        case 'create':
          if (enacted('search')) return false;
          break;
        case 'search':
          return !enacted('create') && traits?.includes('search');
        case 'edit':
          if (enacted('view') || enacted('import') || enacted('export'))
            return false;
          def = !!this.parent;
          break;
        case 'view':
          if (enacted('edit') || enacted('import') || enacted('export'))
            return false;
          def = !!this.parent;
          break;
        default:
          return !!this.parent;
      }

      return !traits ? def : traits.includes(trait);
    };

    const enact = (_action: TyrActionOpts<D> | TyrAction<D>) => {
      // TODO:  clone action if self is already defined?
      const action = TyrAction.get(_action) as TyrAction<D>;
      action.self = this;

      let actFn = action.on;

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
        } else if (action.is('create', 'search')) {
          actFn = opts => {
            this.document = this.createDocument(opts);
          };
        } else if (action.is('cancel')) {
          actFn = () => {};
        } else if (action.is('save')) {
          actFn = () => this.submit();
        }

        action.on = actFn;
      }

      if (action.is('save')) {
        action.on = opts => {
          // we assign to the existing opts here rather than create a new opts because
          // we are given a TyrActionFnOptsWrapper
          opts.document = this.document;
          return actFn!(opts);
        };
      }

      if (action.isEntrance()) {
        const actFn = action.on;

        action.on = opts => {
          this.parentAction = action;
          actFn!(opts);
        };
      }

      this.enact(action);

      if (action.is('create')) {
        createAction = action;
      } else if (action.is('search')) {
        searchAction = action;
      }
    };

    // Manual Actions

    for (const action of actions) enact(action);

    // Default Actions

    if (
      this.canEdit &&
      !enacted('create') &&
      ((!parentLink && !enactedEntrance() && auto('create')) ||
        traits?.includes('create'))
    ) {
      enact({
        trait: 'create',
        name: 'create',
        label: 'Create ' + collection.label,
      });
    }

    if (
      this.canEdit &&
      !enacted('search') &&
      ((!parentLink && !enacted('view') && auto('search')) ||
        traits?.includes('search'))
    ) {
      enact({
        trait: 'search',
        name: 'search',
        label: 'Search ' + collection.label,
      });
    }

    if (auto('view') || auto('edit')) {
      enact({
        name: parentLink ? collection.label : 'edit',
        trait: auto('edit') ? 'edit' : 'view',
        title: !this.canMultiple
          ? (auto('edit') ? 'Edit ' : 'View ') + collection.label
          : Tyr.pluralize(collection.label),
      });
    }

    const addingSave = this.canEdit && auto('view');

    if (auto('cancel')) {
      enact({
        trait: 'cancel',
        input: 0,
        name: enacted('save') || addingSave ? 'cancel' : 'close',
      });
    }

    if (addingSave && !enacted('save')) {
      enact({
        trait: 'save',
        name: 'save',
      });
    }

    // Automatic Actions

    if (!parent) {
      if (createAction || searchAction) {
        setTimeout(() => {
          (createAction || searchAction)!.act({});
        });
      } else {
        const { decorator } = this;
        if (decorator) decorator.visible = true;
      }
    }
  }

  /*
   * * * DECORATORS
   */

  decorator?: TyrDecorator<D>;

  setDecoratorRef = (decorator: TyrDecorator<D>) => {
    this.decorator = decorator;
  };

  wrap(children: () => React.ReactNode) {
    const { parent, decorator } = this.props;

    const Modal = TyrModal as any;
    const Panel = TyrPanel as any;

    return (
      <ComponentContext.Provider value={this as any}>
        {decorator ? (
          React.cloneElement(decorator!, {}, children())
        ) : parent ? (
          <Modal className="tyr-wide-modal">{children()}</Modal>
        ) : (
          <Panel>{children()}</Panel>
        )}
      </ComponentContext.Provider>
    );
  }

  /*
   * * * PAGINATION
   */

  hasPaging = false;

  /*
   * * * SORTING
   */

  hasSortDirection = false;

  updateConfigSort = async (
    columnName?: string,
    sortDirection?: TyrSortDirection
  ) => {
    if (this.componentConfig) {
      const fields = this.componentConfig.fields.forEach(f => {
        if (!columnName) {
          delete f.sortDirection;
        } else if (f.name === columnName) {
          f.sortDirection = sortDirection;
        } else {
          delete f.sortDirection;
        }
      });

      await this.componentConfig.$update({
        query: { _id: this.componentConfig._id },
        update: {
          $set: {
            columns: fields,
          },
        },
      });
    }
  };

  /*
   * * * FILTERS
   */

  hasFilters = false;

  getFilter(props: TyrPathProps<D>): ReturnType<Filter> {
    return undefined;
  }

  updateConfigFilter = async (columnName?: string, filter?: Object) => {
    if (this.componentConfig) {
      const fields = this.componentConfig.fields.forEach(f => {
        if (!columnName) {
          delete f.filter;
        } else if (f.name === columnName) {
          f.filter = filter;
        }
      });

      await this.componentConfig.$update({
        query: { _id: this.componentConfig._id },
        update: {
          $set: {
            columns: fields,
          },
        },
      });
    }
  };

  /*
   * * * WIDTHS
   */

  resetWidths = () => {
    this.updateConfigWidths();
    this.setState({});
  };

  updateConfigWidths = async (columnName?: string, width?: number) => {
    if (this.componentConfig) {
      const { fields } = this.componentConfig;
      for (const f of fields) {
        if (!columnName) {
          delete f.width;
        } else if (f.name === columnName) {
          f.width = width;
        }
      }

      await this.componentConfig.$update({
        query: { _id: this.componentConfig._id },
        update: {
          $set: {
            columns: fields,
          },
        },
      });
    }
  };

  /*
   * * * COMPONENT CONFIG
   */

  @observable
  componentConfig?: Tyr.TyrComponentConfig;

  resetFilters() {}
  resetSort() {}

  reset(...args: ('filters' | 'sort' | 'widths')[]) {
    for (const arg of args) {
      switch (arg) {
        case 'filters':
          this.resetFilters();
          break;
        case 'sort':
          this.resetSort();
          break;
        case 'widths':
          this.resetWidths();
          break;
      }
    }
  }
}
