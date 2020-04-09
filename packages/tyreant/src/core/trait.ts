import { Tyr } from 'tyranid/client';

export const traits: {
  [traitName: string]: { type: Tyr.ActionTraitType; generic?: boolean };
} = {
  create: { type: 'entrance' },
  edit: { type: 'entrance' },
  view: { type: 'entrance' },
  search: { type: 'entrance' },

  // TODO:  shouldn't these just be "create" ?
  import: { type: 'entrance' },
  export: { type: 'entrance' },

  save: { type: 'exit' },
  cancel: { type: 'exit' },
};

export function isEntranceTrait(trait: string) {
  return traits[trait].type === 'entrance';
}

export function isExitTrait(trait: string) {
  return traits[trait].type === 'exit';
}
