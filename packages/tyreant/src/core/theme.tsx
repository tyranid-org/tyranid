import * as React from 'react';
import { useContext } from 'react';

import { Tyr } from 'tyranid/client';

import type { TyrPathLaxProps } from './path';
import type { TyrTypeProps, TyrTypeLaxProps } from '../type/type';
import type { TyrDrawerProps } from './drawer';
import type { TyrFormProps } from './form';
import type { TyrKanbanProps } from './kanban';
import type { TyrDecoratorProps } from './decorator';
import type { TyrTableProps } from './table';
import { TyrAction } from './action';
import { TyrActionOpts } from '../tyreant';

export interface TyrThemeProps {
  action?: Partial<TyrActionOpts<any>>;
  boolean?: Partial<TyrTypeProps<any>>;
  date?: Partial<TyrTypeProps<any>>;
  datetime?: Partial<TyrTypeProps<any>>;
  duration?: Partial<TyrTypeProps<any>>;
  string?: Partial<TyrTypeProps<any>>;
  time?: Partial<TyrTypeProps<any>>;
  drawer?: Partial<TyrDrawerProps<any>>;
  form?: Partial<TyrFormProps<any>>;
  kanban?: Partial<TyrKanbanProps<any>>;
  modal?: Partial<TyrDecoratorProps<any>>;
  table?: Partial<TyrTableProps<any>>;
  panel?: Partial<TyrDecoratorProps<any>>;
  filter?: {
    as?: 'popover' | 'drawer';
    icon?: JSX.Element;
  };
  collections?: {
    [CollectionName in keyof Tyr.CollectionsByName]?: {
      labelRenderer?: (
        document: Tyr.DocumentType<Tyr.CollectionsByName[CollectionName]>
      ) => JSX.Element;
      paths?: {
        [pathName: string]: Partial<
          TyrPathLaxProps<
            Tyr.DocumentType<Tyr.CollectionsByName[CollectionName]>
          >
        >;
      };
    };
  };
}

export const ThemeContext = React.createContext<TyrThemeProps | undefined>(
  undefined
);

export const useThemeProps = <
  K extends keyof TyrThemeProps,
  P extends TyrThemeProps[K]
>(
  type: K,
  props: P,
  path?: Tyr.PathInstance
) => {
  const themeProps = useContext(ThemeContext);

  const tprops = themeProps?.[type];
  const pProps =
    path &&
    themeProps?.collections?.[path.collection.def.name]?.paths?.[path.name];

  let baseActions: TyrAction<any>[], overrideActions: TyrAction<any>[];
  if (
    (baseActions = (tprops as any)?.actions) &&
    (overrideActions = (props as any)?.actions)
  ) {
    return {
      theme: themeProps,
      ...tprops,
      ...pProps,
      ...props,
      actions: TyrAction.merge(baseActions, overrideActions),
    } as P;
  } else {
    return { theme: themeProps, ...tprops, ...pProps, ...props } as P;
  }
};

export const withTheme = <
  K extends keyof TyrThemeProps,
  P extends TyrThemeProps[K]
>(
  type: K,
  ThemedControl: React.ComponentType<P>
) => (props: P) => {
  return <ThemedControl {...useThemeProps(type, props as Required<P>)} />;
};

export const TyrTheme: React.FunctionComponent<TyrThemeProps> = props => (
  <ThemeContext.Provider value={props}>{props.children}</ThemeContext.Provider>
);

export const TypeContext = React.createContext<TyrTypeProps<any> | undefined>(
  undefined
);

export const withThemedTypeContext = (
  type: string | undefined,
  TypeControl: React.ComponentType<TyrTypeProps<any>>
) => (rawProps: TyrTypeLaxProps<any>) => {
  const parentProps = useContext(TypeContext);

  let document = rawProps.document || parentProps?.document;
  if (!document && parentProps) {
    const { component } = parentProps;
    if (component) document = component.document;
  }

  const { aux } = rawProps;
  let auxValid = false;
  if (aux && type && document) {
    document.$model.aux({
      [aux]: { is: type },
    });
    auxValid = true;
  }

  const collection = document?.$model;
  let path: Tyr.PathInstance | undefined;

  if (collection && (!aux || auxValid)) {
    path = Tyr.Path.resolve(
      collection,
      parentProps?.path,
      aux || rawProps.path
    );
    if (!path) {
      const p = rawProps.path;
      if (typeof p === 'string') path = document?.$model.paths[p]?.path;
      else if (p) path = p;
    }
  }

  // we can't return errors until we've used both hooks
  const props = useThemeProps(type as keyof TyrThemeProps, rawProps, path);

  if (!path) return <div className="no-path" />;
  if (!document) return <div className="no-document" />;

  const form = rawProps.form || parentProps?.form;
  if (!form) return <div className="no-form" />;

  if (aux) {
    if (rawProps.path) return <div className="both-aux-and-path-specified" />;
    if (!type) return <div className="aux-not-valid-on-TyrField" />;
  }

  let { searchPath } = props;
  if (typeof searchPath === 'string')
    searchPath = Tyr.Path.resolve(
      collection,
      parentProps?.searchPath,
      searchPath
    );

  if (!path) {
    const p = props.path;
    if (typeof p === 'string') path = document.$model.paths[p]?.path;
    else if (p) path = p;
    if (!path) {
      return <div className="no-path" />;
    }
  }

  const component = parentProps && parentProps.component,
    mode = component?.props.mode;
  return React.createElement(TypeControl, {
    ...(mode && { mode }),
    ...props,
    form,
    document,
    path,
    searchPath,
    component,
  });
};
