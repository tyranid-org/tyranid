import { Tyr } from 'tyranid';

/**
 * add sanitize field def config
 */
declare module 'tyranid' {
  namespace Tyr {
    interface FieldDefinitionRaw {
      sanitize?: boolean | 'name' | 'email' | 'lorem';
    }
  }
}
