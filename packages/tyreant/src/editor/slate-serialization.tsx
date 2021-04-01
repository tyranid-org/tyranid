import { Node, Text } from 'slate';
import { jsx } from 'slate-hyperscript';

export const htmlToSlate = (html: string) => {
  if (!html) return [];

  const document = new DOMParser().parseFromString(html, 'text/html');

  let s = deserialize(document.body);

  // slate doesn't seem to like it when the top-level node is just a text node and not wrapped in some HTML node
  if (Array.isArray(s) && s.length === 1 && s[0].text)
    s = [{ type: 'paragraph', children: s }] as Node[];

  return s;
};

export const slateToHtml = (value: Node[]) => value.map(serialize).join('');

const deserialize = (
  el: HTMLElement | ChildNode
): Node | Node[] | string | null => {
  if (el.nodeType === 3) {
    return el.textContent;
  } else if (el.nodeType !== 1) {
    return null;
  }

  const children = Array.from(el.childNodes).map(deserialize);

  switch (el.nodeName) {
    case 'A':
      return jsx(
        'element',
        { type: 'link', url: (el as HTMLElement).getAttribute('href') },
        children
      );
    case 'BLOCKQUOTE':
      return jsx('element', { type: 'quote' }, children);
    case 'BODY':
      return jsx('fragment', {}, children);
    case 'BR':
      return '\n';
    case 'H1':
      return jsx('element', { type: 'heading-one' }, children);
    case 'H2':
      return jsx('element', { type: 'heading-two' }, children);
    case 'P':
      return jsx('element', { type: 'paragraph' }, children);
    case 'STRONG':
      return jsx('text', { bold: true }, children);
    case 'EM':
      return jsx('text', { italic: true }, children);
    case 'U':
      return jsx('text', { underline: true }, children);
    case 'CODE':
      return jsx('text', { code: true }, children);
    default:
      return el.textContent;
  }
};

const serialize = (node: Node): string => {
  if (Text.isText(node)) {
    let text = escapeHtml(node.text!);

    if (node.code) text = `<code>${text}</code>`;
    if (node.bold) text = `<strong>${text}</strong>`;
    if (node.italic) text = `<em>${text}</em>`;
    if (node.underline) text = `<u>${text}</u>`;
    return text;
  }

  const children = node.children.map(n => serialize(n)).join('');

  switch (node.type) {
    case 'quote':
      return `<blockquote><p>${children}</p></blockquote>`;
    case 'heading-one':
      return `<h1>${children}</h1>`;
    case 'heading-two':
      return `<h2>${children}</h2>`;
    case 'paragraph':
      return `<p>${children}</p>`;
    case 'link':
      return `<a href="${escapeHtml(node.url as string)}">${children}</a>`;
    default:
      return children;
  }
};

const escapeHtml = (str: string): string => {
  let out: string | undefined,
    si = 0,
    wrotesi = 0;
  for (const slen = str.length; si < slen; si++) {
    let escape;

    switch (str.charCodeAt(si)) {
      case 34:
        escape = '&quot;';
        break;
      case 38:
        escape = '&amp;';
        break;
      case 39:
        escape = '&#39;';
        break;
      case 60:
        escape = '&lt;';
        break;
      case 62:
        escape = '&gt;';
        break;
      default:
        continue;
    }

    if (out) {
      if (wrotesi < si) {
        out += str.substring(wrotesi, si);
      }
    } else {
      out = str.substring(0, si);
    }

    out += escape;
    wrotesi = si + 1;
  }

  return !out ? str : wrotesi < si ? out + str.substring(wrotesi, si) : out;
};
