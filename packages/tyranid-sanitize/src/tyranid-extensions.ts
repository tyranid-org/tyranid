import { Tyr } from 'tyranid';
import { SanitizeConfig } from './sanitize';
/**
 * add sanitize field def config
 */
declare module 'tyranid' {
  namespace Tyr {
    interface FieldDefinitionRaw {
      sanitize?: SanitizeConfig;
    }
  }
}
