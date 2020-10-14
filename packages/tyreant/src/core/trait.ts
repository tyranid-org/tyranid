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

  filter: { type: 'builtin' },

  save: { type: 'exit' },
  cancel: { type: 'exit' },
};

export const isEditTrait = (trait: string) =>
  trait === 'edit' || trait === 'create';

export const isEntranceTrait = (trait: string) =>
  traits[trait]?.type === 'entrance';

export const isExitTrait = (trait: string) => traits[trait]?.type === 'exit';

export const isNonLocalTrait = (trait: string) => {
  const t = traits[trait]?.type;
  return t === 'entrance' || t == 'exit';
};
