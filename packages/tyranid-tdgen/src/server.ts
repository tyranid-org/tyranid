import * as _ from 'lodash';
import { Tyr } from 'tyranid';
import { generateCollectionLookups, generateCommonTypes } from './isomorphic';
import * as names from './names';
import { generateDefinitionPreamble } from './preamble';
import { InterfaceGenerationOptions, pad } from './util';

/**
 *
 * Generate tyranid definition file for server usage, extends existing tyranid types
 *
 */
export function generateServerDefinitionFile(
  collections: Tyr.CollectionInstance[],
  passedOptions: InterfaceGenerationOptions = {}
) {
  const td = `${generateDefinitionPreamble(passedOptions)}
import { ObjectID } from 'mongodb';
import { Tyr } from 'tyranid';
import { Tyr as ${names.isomorphic()} } from 'tyranid/isomorphic';

declare module 'tyranid' {

  namespace Tyr {
    export type CollectionName = ${names.isomorphic('CollectionName')};
    export type CollectionId = ${names.isomorphic('CollectionId')};

    ${generateCommonTypes(collections, 'server', 'ObjectID')}
    ${generateCollectionLookups(collections, false)}
  }

}
`;

  return td;
}
