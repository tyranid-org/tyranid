import * as React from 'react';

import { Avatar, Tooltip } from 'antd';

import { ExclamationCircleOutlined } from '@ant-design/icons';
import { Tyr } from 'tyranid/client';

import { TyrPathProps } from './path';
import { TyrTypeProps } from '../type/type';

export const labelFieldFor = (
  props: TyrPathProps<any>,
  collection: Tyr.CollectionInstance<any>
) => {
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
  if (link) {
    lr = pathProps.theme?.collections?.[link.def.name]
      ?.labelRenderer as TyrLabelRenderer;
    if (lr) return lr;

    const { labelImageField } = link;
    if (labelImageField) {
      const { path } = labelImageField;
      return (doc: Tyr.Document<any>) => (
        <>
          <Avatar src={path.get(doc)} className="tyr-image-label" />
          <span>{doc.$label}</span>
        </>
      );
    }
  }

  return (doc: D) => <>{doc.$label}</>;
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
