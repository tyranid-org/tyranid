/*
     tyreant =
     TYRanid +
       REAct +
         ANT 
*/

import * as React from 'react';

import { notification } from 'antd';

export * from './type';
export * from './core';
export * from './layout';
export * from './util';
export * from './admin';

import { registerComponent, componentsByName } from './common';
import { TyrRouter, generatePageRoutes } from './core';

export class Tyreant {
  router!: TyrRouter;

  pageRoutes!: any; //JSX.Element;

  componentsByName = componentsByName;

  async init(router: TyrRouter) {
    this.router = router;
    this.pageRoutes = await generatePageRoutes();
  }

  // TODO:  need run-time type information to get rid of any
  register = registerComponent;

  routes() {
    return this.pageRoutes;
  }
}

export const tyreant = new Tyreant();

export const toast = {
  success: (message: string) => notification.success({ message }),
  info: (message: string) => notification.info({ message }),
  warn: (message: string) => notification.warn({ message }),
  error: (message: string) => notification.error({ message })
};
