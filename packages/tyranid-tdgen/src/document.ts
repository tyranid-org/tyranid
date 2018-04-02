import { Tyr } from 'tyranid';
import * as names from './names';

/**
 * generate interface for tyranid document type
 */
export function docInterface(
  col: Tyr.CollectionInstance,
  opts: { superInterface?: string; idType?: string } = {}
): string {
  const { name, fields } = col.def;
  const { superInterface = 'Inserted', idType = 'string' } = opts;
  const interfaceName = names.document(name);
  const baseName = names.base(name);
  const colName = names.collection(name);

  return `
    /**
     * Document returned by collection "${name}" <${colName}>
     */
    export interface ${interfaceName}<IdType = ${idType}>
      extends ${superInterface}<IdType>,
              ${baseName}<IdType, ${superInterface}<IdType>> {}
    `;
}
