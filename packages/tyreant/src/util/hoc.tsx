import * as React from 'react';

export const getDisplayName = (WrappedComponent: React.ComponentType) =>
  WrappedComponent.displayName || WrappedComponent.name || 'Component';

export const wrapHoc = (
  name: string,
  WrappedComponent: React.ComponentType
) => {
  WrappedComponent.displayName = `${name}(${getDisplayName(WrappedComponent)})`;
};
