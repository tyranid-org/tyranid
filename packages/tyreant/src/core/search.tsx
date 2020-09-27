import * as React from 'react';

import { Input } from 'antd';

import { useComponent, TyrComponent } from './component';

export const TyrSearchBar = ({
  component,
}: {
  component?: TyrComponent<any>;
}) => {
  const c = component || useComponent();
  if (!c) return <div className="no-component" />;

  return (
    <Input.Search
      enterButton
      value={c.filterSearchValue}
      onChange={ev => {
        const v = ev.target.value;
        c.filterSearchValue = v;
        if (c.local) c.query();
      }}
    />
  );
};
