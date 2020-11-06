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
