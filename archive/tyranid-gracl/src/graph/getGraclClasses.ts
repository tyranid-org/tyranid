import { Resource, Subject } from 'gracl';
import { Tyr } from 'tyranid';
import { GraclPlugin } from '../classes/GraclPlugin';
import { createResource } from './createResource';
import { createSubject } from './createSubject';

// given a resource and subject doc, wrap both in `gracl` Instances
export function getGraclClasses(
  plugin: GraclPlugin,
  resourceDocument: Tyr.Document,
  subjectDocument: Tyr.Document
): { subject: Subject; resource: Resource } {
  const subject = createSubject(plugin, subjectDocument);
  const resource = createResource(plugin, resourceDocument);

  return { subject, resource };
}
