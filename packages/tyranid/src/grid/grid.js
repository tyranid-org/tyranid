import Tyr from '../tyr';

export async function pathify(collection, columns) {
  if (columns) {
    for (const column of columns) {
      const { path } = column;

      if (!(path instanceof Tyr.Path)) {
        try {
          column.path = collection.parsePath(path);
        } catch (err) {
          column.path = (await collection.findField(path))?.path;
        }
      }
    }
  }
}

export const createLogger = log =>
  log
    ? message => {
        log.issues = log.issues || '';
        if (!log.issues.includes(message)) {
          log.issues += message + '<br>';
          console.warn(message);
        }
      }
    : message => console.warn(message);
