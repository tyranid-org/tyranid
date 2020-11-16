import * as React from 'react';

import { Avatar, Tooltip } from 'antd';

import { ExclamationCircleOutlined } from '@ant-design/icons';
import { Tyr } from 'tyranid/client';

import { TyrPathProps } from './path';
import { TyrTypeProps } from '../type/type';

export const labelFieldFor = (
  props: TyrPathProps<any>,
  collection: Tyr.CollectionInstance<any>
): Tyr.FieldInstance<any> | undefined => {
  const { labelField } = props;
  return labelField ? collection.paths[labelField] : collection.labelField;
};

// usually want to use getLabelRenderer over this
export const labelFor = (
  props: TyrPathProps<any>,
  document: Tyr.Document<any>
) => {
  const { labelField } = props;

  return labelField
    ? ((document as any)[labelField] as string)
    : document.$label;
};

/**
 * A path is sortable in the database if it is a simple value (integer, string, etc.)
 * or if it is a link and the link's label is denormalized so is available to be sorted.
 */
export const isDbSortable = (props: TyrPathProps<any>) => {
  const path = props.path!;
  const field = path.detail;

  const { link } = field;
  if (link) {
    const { denormal } = path;
    if (denormal) {
      const lf = labelFieldFor(props, link);
      if (lf && denormal[lf.spath]) return true;
    }
  } else if (!field.of?.link) {
    return true;
  }

  return false;
};

export const getDbSortPath = (props: TyrPathProps<any>) => {
  const path = props.path!,
    field = path.detail;

  const { link } = field;
  if (link) {
    const { denormal } = path;
    if (denormal) {
      const lf = labelFieldFor(props, link);
      if (lf) {
        const { name } = lf;
        if (denormal[name]) return lf && name + '_.' + lf.spath;
      }
    }
  } else if (!field.of?.link) {
    return path.spath;
  }

  return undefined;
};

export const labelForProps = (props: TyrTypeProps<any>) => {
  const label = props.label;
  return label || props.path!.pathLabel;
};

export type TyrLabelRenderer = (doc: Tyr.Document<any>) => JSX.Element;

export const renderFieldLabel = (props: TyrTypeProps<any>) => {
  const { path } = props;
  const field = path?.tail;
  const help = field?.def?.help;

  return (
    <>
      {labelForProps(props)}
      {help && (
        <Tooltip title={help}>
          &nbsp;
          <ExclamationCircleOutlined />
        </Tooltip>
      )}
    </>
  );
};

export const getLabelRenderer = <D extends Tyr.Document>(
  pathProps: TyrPathProps<D>
) => {
  let lr = pathProps.filterOptionRenderer;
  if (lr) return lr;

  const { labelField } = pathProps;
  if (labelField) {
    return (doc: D) => <>{(doc as any)[labelField]}</>;
  }

  const link = pathProps.path?.detail.link;

  const labelFn = (doc: D) => {
    let l = doc.$label;

    const alternateLabelFields = doc.$model?.alternateLabelFields;
    if (alternateLabelFields) {
      for (const alf of alternateLabelFields) {
        const v = alf.path.get(doc);
        if (v) l += `- ${v}`;
      }
    }

    return l;
  };

  if (link) {
    lr = pathProps.theme?.collections?.[link.def.name]
      ?.labelRenderer as TyrLabelRenderer;
    if (lr) return lr;

    const { labelImageField } = link;
    if (labelImageField) {
      const { path } = labelImageField;
      return (doc: D) => (
        <>
          <Avatar src={path.get(doc)} className="tyr-image-label" />
          <span>{labelFn(doc)}</span>
        </>
      );
    }
  }

  return (doc: D) => <>{labelFn(doc)}</>;
};

export interface TyrLabelProps {
  label: string;
  children?: React.ReactNode;
}

export const TyrLabel = (props: TyrLabelProps) => (
  <div className="ant-row ant-form-item">
    <div className="ant-col ant-form-item-label">
      <label>{props.label}</label>
    </div>
    {props.children}
  </div>
);
