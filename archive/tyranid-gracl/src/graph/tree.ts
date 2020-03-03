export interface TreeNode {
  label: string;
  nodes?: TreeNode[];
}

// borrowed from https://github.com/substack/node-archy
export function tree(obj: TreeNode, prefix: string = ''): string {
  const nodes = obj.nodes || [];
  const lines = (obj.label || '').split('\n');
  const splitter = '\n' + prefix + (nodes.length ? '│' : ' ') + ' ';

  return (
    prefix +
    lines.join(splitter) +
    '\n' +
    nodes
      .map((node, ix) => {
        const last = ix === nodes.length - 1;
        const more = node.nodes && node.nodes.length;
        const prefixModified = prefix + (last ? ' ' : '│') + ' ';

        return (
          prefix +
          (last ? '└' : '├') +
          '─' +
          (more ? '┬' : '─') +
          ' ' +
          tree(node, prefixModified).slice(prefix.length + 2)
        );
      })
      .join('')
  );
}
