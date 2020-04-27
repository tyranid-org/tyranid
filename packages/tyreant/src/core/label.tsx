import * as React from 'react';

import { Avatar, Tooltip } from 'antd';

import { ExclamationCircleOutlined } from '@ant-design/icons';
import { Tyr } from 'tyranid/client';

import { TyrPathProps } from './path';
import { TyrTypeProps } from '../type/type';

export type TyrLabelRenderer = (doc: Tyr.Document<any>) => JSX.Element;

export const labelForProps = (props: TyrTypeProps<any>) => {
  const label = props.label;
  return label || props.path!.pathLabel;
};

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

  return (doc: Tyr.Document<any>) => <>{doc.$label}</>;
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
