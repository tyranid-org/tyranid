import * as React from 'react';

export const componentsByName: { [name: string]: React.ComponentType } = {};

// TODO:  need run-time type information to get  rid of any
export function registerComponent(
  name: string,
  component: React.ComponentType<any>
) {
  componentsByName[name.toUpperCase()] = component;
}
