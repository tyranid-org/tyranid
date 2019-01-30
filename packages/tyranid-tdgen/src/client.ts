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

import 'tyranid/client';
import { Tyr as ${names.isomorphic()} } from 'tyranid/isomorphic';

declare module 'tyranid/client' {

  export namespace Tyr {

    ${generateCommonTypes(collections, 'client', 'string')}
    ${generateCollectionLookups(collections, true)}
  }

}
`;

  return td;
}
