import { Tyr } from 'tyranid';

/**
 * standardize interface / type naming
 */
export const format = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const base = (s: string) => `Base${format(s)}`;
export const collection = (s: string) => `${format(s)}Collection`;
export const enumStatic = (s: string) => `${format(s)}CollectionEnumStatic`;
export const id = (s: string) => `${format(s)}Id`;
export const document = format;
export const isomorphic = (s: string = '') => `Isomorphic${s ? '.' + s : ''}`;
export const idType = (col: Tyr.CollectionInstance) => {
  if (col.def.enum) return id(col.def.name);
  const idType = col.fields._id.type;
  if (idType.name === 'mongoid') return 'ObjIdType';
  return idType.def.typescript!;
};
export const identifier = (s: string) => (s.indexOf('.') >= 0 ? `'${s}'` : s);
