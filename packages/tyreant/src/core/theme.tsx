import * as React from 'react';
import { useContext } from 'react';

import { useForm } from 'antd/lib/form/util';

import { Tyr } from 'tyranid/client';

import type { TyrTypeProps, TyrTypeLaxProps } from '../type/type';
import type { TyrDrawerProps } from './drawer';
import type { TyrFormProps } from './form';
import type { TyrKanbanProps } from './kanban';
import type { TyrModalProps } from './modal';
import type { TyrTableProps } from './table';

export interface TyrThemeProps {
  drawer?: Partial<TyrDrawerProps<any>>;
  form?: Partial<TyrFormProps<any>>;
  kanban?: Partial<TyrKanbanProps<any>>;
  modal?: Partial<TyrModalProps<any>>;
  table?: Partial<TyrTableProps<any>>;
}

export const ThemeContext = React.createContext<TyrThemeProps | undefined>(
  undefined
);

export const useThemeProps = <
  K extends keyof TyrThemeProps,
  P extends TyrThemeProps[K]
>(
  type: K,
  props: P
) => {
  const themeProps = useContext(ThemeContext);

  const tprops = themeProps?.[type];
  return (tprops ? { ...tprops, ...props } : props) as P;
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

export const TypeContext = React.createContext<TyrTypeProps | undefined>(
  undefined
);

export const withThemedTypeContext = <T extends {} = {}>(
  type: string | undefined,
  TypeControl: React.ComponentType<T & TyrTypeProps>
) => (props: T & TyrTypeLaxProps) => {
  const parentProps = useContext(TypeContext);
  const [form] = useForm();//props.form || (parentProps && parentProps.form);
  if (!form) return <div className="no-form" />;

  let document = props.document || (parentProps?.document);
  if (!document) {
    const { component } = props;
    if (component) document = component.document;

    if (!document)
      return <div className="no-document" />;
  }

  const collection = document.$model;

  const { aux } = props;
  if (aux) {
    if (props.path) return <div className="both-aux-and-path-specified" />;
    if (!type) return <div className="aux-not-valid-on-TyrField" />;

    document.$model.aux({
      [aux]: { is: type }
    });
  }

  let path = Tyr.NamePath.resolve(
    collection,
    parentProps?.path,
    aux || props.path
  );
  if (!path) {
    const p = props.path;
    if (typeof p === 'string') path = document.$model.paths[p]?.namePath;
    else if (p) path = p;
    if (!path) {
      return <div className="no-path" />;
    }
  }

  let { searchPath } = props;
  if (typeof searchPath === 'string')
    searchPath = Tyr.NamePath.resolve(
      collection,
      parentProps?.searchPath,
      searchPath
    );

  if (!path) {
    const p = props.path;
    if (typeof p === 'string') path = document.$model.paths[p]?.namePath;
    else if (p) path = p;
    if (!path) {
      return <div className="no-path" />;
    }
  }
  return React.createElement(TypeControl, {
    ...useThemeProps(type as keyof TyrThemeProps, props),
    form,
    document,
    path,
    searchPath,
    component: parentProps && parentProps.component
  });
};