import * as React from 'react';

import { Avatar } from 'antd';

import { Tyr } from 'tyranid/client';

import { TyrPathProps } from './path';

export type TyrLabelRenderer = (doc: Tyr.Document<any>) => JSX.Element;

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
