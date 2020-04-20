import * as React from 'react';

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
