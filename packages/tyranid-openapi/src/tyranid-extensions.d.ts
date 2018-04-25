import { Tyr } from 'tyranid';
import { CollectionSchemaOptions, FieldSchemaOptions } from './interfaces';

/**
 * module augmentations for tyranid
 */
declare module 'tyranid' {
  namespace Tyr {
    interface CollectionDefinitionHydrated {
      /**
       * Open API spec generation options for collection as a whole.
       * can be boolean to add all default routes or object
       * for more granular control.
       */
      openAPI?: CollectionSchemaOptions | boolean;
    }

    interface FieldDefinition {
      /**
       * Open API spec generation options for specific field.
       * Can be boolean to add all default routes or object
       * for more granular control.
       */
      openAPI?: FieldSchemaOptions | boolean;
    }
  }
}
