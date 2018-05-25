import * as _ from 'lodash';
import { Tyr } from 'tyranid';
import { generateCollectionLookups, generateCommonTypes } from './isomorphic';
import * as names from './names';
import { generateDefinitionPreamble } from './preamble';
import { InterfaceGenerationOptions, pad } from './util';

/**
 *
 * Generate tyranid definition file for client usage
 *
 */
export function generateClientDefinitionFile(
  collections: Tyr.CollectionInstance[],
  passedOptions: InterfaceGenerationOptions = {}
) {
  const td = `${generateDefinitionPreamble(passedOptions)}

declare module 'tyranid-client' {
  import { Tyr as ${names.isomorphic()} } from 'tyranid-isomorphic';
  import * as io from 'socket.io-client';

  export namespace Tyr {

    export const byName: CollectionsByName & { [key: string]: CollectionInstance | void };
    export const byId: CollectionsById & { [key: string]: CollectionInstance | void };
    export const init: () => void;
    export const setSocketLibrary: (library: typeof io) => void;
    export const reconnectSocket: () => void;
    export type CollectionName = ${names.isomorphic('CollectionName')};
    export type CollectionId = ${names.isomorphic('CollectionId')};

    export interface CollectionInstance<T extends Document = Document> {
      findAll(args: any): Promise<T[]>;
      findOne(args: any): Promise<T | null>;
      idToUid(id: string): string;
      on(opts: any): () => void;
      subscribe(query: any, cancel?: boolean): Promise<void>;
      values: T[];
      labels(search: string | string[]): Promise<T[]>;
    }

    export interface Document {
      $model: CollectionInstance<this>;
      $uid: string;
      $id: string;
    }

    ${generateCommonTypes(collections, 'client', 'string')}
    ${generateCollectionLookups(collections, true)}
  }

}
`;

  return td;
}
