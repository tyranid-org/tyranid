import { Tyr } from 'tyranid';
import { GraclPlugin } from '../classes/GraclPlugin';

export function validate(plugin: GraclPlugin, uid: string) {
  try {
    Tyr.parseUid(uid);
  } catch (err) {
    if (
      /must be a single String of 12 bytes or a string of 24 hex characters/.test(
        err.message
      )
    ) {
      plugin.error(`Invalid uid: ${uid}`);
    }
    throw err;
  }
}

export function extractIdAndModel(
  plugin: GraclPlugin,
  doc: Tyr.Document | string
) {
  if (typeof doc === 'string') {
    validate(plugin, doc);
    const components: { [key: string]: {} } = Tyr.parseUid(doc) || {};
    return {
      $uid: doc as string,
      $model: components.collection as Tyr.CollectionInstance
    };
  } else {
    validate(plugin, doc.$uid);
    return {
      $uid: doc.$uid as string,
      $model: doc.$model
    };
  }
}
