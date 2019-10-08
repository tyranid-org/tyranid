/*
     tyreant =
     TYRanid +
       REAct +
         ANT 

*/

export * from './type';
export * from './core';

import { TyrRouter } from './core/router';

export class Tyreant {
  router!: TyrRouter;

  init(router: TyrRouter) {
    this.router = router;
  }
}

export const tyreant = new Tyreant();
