import { Tyr } from 'tyranid';
import * as names from './names';

/**
 * generate interface for tyranid document type
 */
export function docInterface(col: Tyr.CollectionInstance): string {
  const { name } = col.def;
  const interfaceName = names.document(name);
  const baseName = names.base(name);
  const colName = names.collection(name);

  return `
    /**
     * Document returned by collection "${name}" <${colName}>
     */
    export interface ${interfaceName}<ObjIdType = string, ObjContainer = Inserted<string>, NumContainer = Inserted<number>>
      extends Inserted<${names.idType(col)}>,
              ${baseName}<ObjIdType, ObjContainer, NumContainer> {}
    `;
}
