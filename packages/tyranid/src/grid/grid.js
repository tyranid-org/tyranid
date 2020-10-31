import Tyr from '../tyr';

export async function pathify(collection, columns) {
  for (const column of columns) {
    const { path } = column;

    if (!(path instanceof Tyr.Path)) {
      try {
        column.path = collection.parsePath(path);
      } catch {
        column.path = (await collection.findField(path))?.path;
      }
    }
  }
}
