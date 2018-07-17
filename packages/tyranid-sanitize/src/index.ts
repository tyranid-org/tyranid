import { Tyr } from 'tyranid';
import { SanitizeConfig } from './sanitize';

export { sanitize, SanitizeConfig, SanitizeOptions } from './sanitize';

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
