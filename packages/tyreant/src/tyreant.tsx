/*
     tyreant =
     TYRanid +
       REAct +
         ANT 

*/

import * as React from 'react';

export * from './type';
export * from './core';
export * from './admin';

import { registerComponent, componentsByName } from './common';
import { TyrRouter, generatePageRoutes } from './core';
import { Tyr } from 'tyranid/client';
import { notification } from 'antd';

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

declare module 'tyranid/client' {
  export namespace Tyr {
    export const eant: Tyreant;

    //export function log(message: string): void;
    export function success(message: string): void;
    export function info(message: string): void;
    export function warn(message: string): void;
    export function error(message: string): void;
  }
}

export { Tyr };

// any to override const
(Tyr as any).eant = tyreant;
Tyr.success = (message: string) => notification.success({ message });
Tyr.info = (message: string) => notification.info({ message });
Tyr.warn = (message: string) => notification.warn({ message });
Tyr.error = (message: string) => notification.error({ message });
