import { Subject } from 'gracl';
import { Tyr } from 'tyranid';
import { GraclPlugin } from '../classes/GraclPlugin';

/**
 * Given a subject document, wrap it in a `gracl` Subject instance
 */
export function createSubject(
  plugin: GraclPlugin,
  subjectDocument: Tyr.Document
): Subject {
  if (!(subjectDocument && subjectDocument.$uid)) {
    plugin.error(
      'No subject document provided (or Tyr.local.user is unavailable)!'
    );
  }

  const subjectCollectionName = subjectDocument.$model.def.name;
  const SubjectClass = plugin.graclHierarchy.getSubject(subjectCollectionName);

  if (!SubjectClass) {
    plugin.error(
      `Attempted to set/get permission using ${subjectCollectionName} as subject, ` +
        `no relevant subject class found in tyranid-gracl plugin!`
    );
  }

  return new SubjectClass(subjectDocument);
}
