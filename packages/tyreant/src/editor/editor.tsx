import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as ReactDOM from 'react-dom';

import { Button } from 'antd';
import {
  BoldOutlined,
  CodeOutlined,
  ItalicOutlined,
  OrderedListOutlined,
  UnderlineOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';

import {
  Editor,
  Transforms,
  createEditor,
  Node,
  Element as SlateElement,
  Range,
} from 'slate';
import {
  Editable,
  withReact,
  useFocused,
  useSelected,
  useSlate,
  Slate,
  ReactEditor,
} from 'slate-react';
import { withHistory } from 'slate-history';
import isHotkey from 'is-hotkey';

import {
  MentionElement,
  htmlToSlate,
  slateToHtml,
} from './slate-serialization';

const HOTKEYS: { [hotkey: string]: string } = {
  'mod+b': 'bold',
  'mod+i': 'italic',
  'mod+u': 'underline',
  'mod+`': 'code',
};

const LIST_TYPES = ['numbered-list', 'bulleted-list'];

const Portal = ({ children }: { children: JSX.Element }) =>
  typeof document === 'object'
    ? ReactDOM.createPortal(children, document.body)
    : null;

export const TextEditor = ({
  value,
  onChange,
  mentionFeeds,
}: {
  value?: string;
  onChange?: (value: string) => void;
  mentionFeeds?: {
    marker: string;
    feed: string[];
    minimumCharacters: number;
  };
}) => {
  console.log('TextEditor render, value', value);
  const editValue = useMemo(() => htmlToSlate(value ?? '') as Node[], [value]);

  const renderElement = useCallback(props => <Element {...props} />, []);
  const renderLeaf = useCallback(props => <Leaf {...props} />, []);
  const editor = useMemo(
    () => withHistory(withReact(createEditor() as any)),
    []
  );

  const ref = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState<Range | undefined>();
  const [index, setIndex] = useState(0);
  const [search, setSearch] = useState('');

  const chars = (mentionFeeds?.feed ?? [])
    .filter(c => c.toLowerCase().startsWith(search))
    .slice(0, 10);

  const onKeyDown = useCallback(
    event => {
      for (const hotkey in HOTKEYS) {
        if (isHotkey(hotkey, event)) {
          event.preventDefault();
          const mark = HOTKEYS[hotkey];
          toggleMark(editor, mark);
        }
      }

      //console.log('onKeyDown', { target });
      if (target) {
        switch (event.key) {
          case 'ArrowDown':
            event.preventDefault();
            const prevIndex = index >= chars.length - 1 ? 0 : index + 1;
            setIndex(prevIndex);
            break;
          case 'ArrowUp':
            event.preventDefault();
            const nextIndex = index <= 0 ? chars.length - 1 : index - 1;
            setIndex(nextIndex);
            break;
          case 'Tab':
          case 'Enter':
            event.preventDefault();
            Transforms.select(editor, target);
            insertMention(editor, chars[index]);
            setTarget(undefined);
            break;
          case 'Escape':
            event.preventDefault();
            setTarget(undefined);
            break;
        }
      }
    },
    [index, search, target]
  );

  useEffect(() => {
    if (target && chars.length > 0) {
      const el = ref.current;
      const domRange = ReactEditor.toDOMRange(editor, target);
      const rect = domRange.getBoundingClientRect();
      el!.style.top = `${rect.top + window.pageYOffset + 24}px`;
      el!.style.left = `${rect.left + window.pageXOffset}px`;
    }
  }, [chars.length, editor, index, search, target]);

  return (
    <div className="tyr-slate-editor">
      <Slate
        editor={editor}
        value={editValue}
        onChange={value => {
          //setEditValue(value);
          const s = slateToHtml(value);
          //console.log('TextEditor onChange, newHtml', s);
          onChange?.(s);

          //setValue(value);
          const { selection } = editor;

          if (selection && Range.isCollapsed(selection)) {
            const [start] = Range.edges(selection);
            const wordBefore = Editor.before(editor, start, { unit: 'word' });
            const before = wordBefore && Editor.before(editor, wordBefore);
            const beforeRange = before && Editor.range(editor, before, start);
            const beforeText =
              beforeRange && Editor.string(editor, beforeRange);
            const beforeMatchRegex = new RegExp(
              '^(' + (mentionFeeds?.marker ?? '@') + '.*)$'
            );
            const beforeMatch = beforeText?.trim().match(beforeMatchRegex);
            const after = Editor.after(editor, start);
            const afterRange = Editor.range(editor, start, after);
            const afterText = Editor.string(editor, afterRange);
            const afterMatch = afterText.match(/^(\s|$)/);
            /*console.log({
              wordBefore,
              before,
              beforeRange,
              beforeText,
              beforeMatch,
              beforeMatchRegex,
            });*/

            if (beforeMatch && afterMatch) {
              setTarget(beforeRange);
              setSearch(beforeMatch[1].toLowerCase());
              setIndex(0);
              return;
            }
          }

          setTarget(undefined);
        }}
      >
        <div className="tyr-slate-toolbar" contentEditable={false}>
          <MarkButton format="bold" icon={<BoldOutlined />} />
          <MarkButton format="italic" icon={<ItalicOutlined />} />
          <MarkButton format="underline" icon={<UnderlineOutlined />} />
          <MarkButton format="code" icon={<CodeOutlined />} />
          <BlockButton format="heading-one" icon={<span>H1</span>} />
          <BlockButton format="heading-two" icon={<span>H2</span>} />
          <BlockButton format="block-quote" icon={<span>"</span>} />
          <BlockButton format="numbered-list" icon={<OrderedListOutlined />} />
          <BlockButton
            format="bulleted-list"
            icon={<UnorderedListOutlined />}
          />
        </div>
        <Editable
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          placeholder="Enter some rich text…"
          spellCheck
          autoFocus
          onKeyDown={onKeyDown}
        />
      </Slate>
      {target && chars.length > 0 && (
        <Portal>
          <div
            ref={ref}
            style={{
              top: '0px',
              left: '8px',
              position: 'absolute',
              zIndex: 1000,
              padding: '3px',
              background: 'white',
              borderRadius: '4px',
              boxShadow: '0 1px 5px rgba(0,0,0,.2)',
            }}
          >
            {chars.map((char, i) => (
              <div
                key={char}
                style={{
                  padding: '1px 3px',
                  borderRadius: '3px',
                  background: i === index ? '#B4D5FF' : 'transparent',
                }}
              >
                {char}
              </div>
            ))}
          </div>
        </Portal>
      )}
    </div>
  );
};

const toggleBlock = (editor: ReactEditor, format: string) => {
  const isActive = isBlockActive(editor, format);
  const isList = LIST_TYPES.includes(format);

  Transforms.unwrapNodes(editor, {
    match: n =>
      LIST_TYPES.includes(
        (!Editor.isEditor(n) &&
          SlateElement.isElement(n) &&
          (n as any).type) as string
      ),
    split: true,
  });
  const newProperties: Partial<SlateElement> = {
    type: isActive ? 'paragraph' : isList ? 'list-item' : format,
  } as any;
  Transforms.setNodes(editor, newProperties);

  if (!isActive && isList) {
    const block = { type: format, children: [] };
    Transforms.wrapNodes(editor, block);
  }
};

const toggleMark = (editor: ReactEditor, format: string) => {
  const isActive = isMarkActive(editor, format);

  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
};

const isBlockActive = (editor: ReactEditor, format: string) => {
  const [match] = Editor.nodes(editor, {
    match: n =>
      !Editor.isEditor(n) &&
      SlateElement.isElement(n) &&
      (n as any).type === format,
  });

  return !!match;
};

const isMarkActive = (editor: ReactEditor, format: string) => {
  const marks = Editor.marks(editor);
  return marks ? (marks as any)[format] === true : false;
};

const Element = ({
  attributes,
  element,
  children,
}: {
  attributes: any;
  element: any;
  children: any;
}) => {
  switch (element.type) {
    case 'block-quote':
      return <blockquote {...attributes}>{children}</blockquote>;
    case 'bulleted-list':
      return <ul {...attributes}>{children}</ul>;
    case 'heading-one':
      return <h1 {...attributes}>{children}</h1>;
    case 'heading-two':
      return <h2 {...attributes}>{children}</h2>;
    case 'list-item':
      return <li {...attributes}>{children}</li>;
    case 'numbered-list':
      return <ol {...attributes}>{children}</ol>;
    case 'mention':
      return <Mention {...attributes} />;
    default:
      return <p {...attributes}>{children}</p>;
  }
};

const Leaf = ({
  attributes,
  leaf,
  children,
}: {
  attributes: any;
  leaf: any;
  children: any;
}) => {
  if (leaf.bold) children = <strong>{children}</strong>;
  if (leaf.code) children = <code>{children}</code>;
  if (leaf.italic) children = <em>{children}</em>;
  if (leaf.underline) children = <u>{children}</u>;

  return <span {...attributes}>{children}</span>;
};

const Mention = ({
  attributes,
  children,
  element,
}: {
  attributes: any;
  children: any;
  element: any;
}) => {
  const selected = useSelected();
  const focused = useFocused();
  return (
    <span
      {...attributes}
      contentEditable={false}
      style={{
        padding: '3px 3px 2px',
        margin: '0 1px',
        verticalAlign: 'baseline',
        display: 'inline-block',
        borderRadius: '4px',
        backgroundColor: '#eee',
        fontSize: '0.9em',
        boxShadow: selected && focused ? '0 0 0 2px #B4D5FF' : 'none',
      }}
    >
      @{element.character}
      {children}
    </span>
  );
};

const BlockButton = ({
  format,
  icon,
}: {
  format: string;
  icon: JSX.Element;
}) => {
  const editor = useMemo(
    () => withMentions(withReact(withHistory(createEditor() as any))),
    []
  );
  return (
    <Button
      className={isBlockActive(editor, format) ? 'tyr-active' : ''}
      onMouseDown={event => {
        event.preventDefault();
        toggleBlock(editor, format);
      }}
    >
      {icon}
    </Button>
  );
};

const MarkButton = ({
  format,
  icon,
}: {
  format: string;
  icon: JSX.Element;
}) => {
  const editor = useSlate();
  return (
    <Button
      className={isMarkActive(editor as any, format) ? 'tyr-active' : ''}
      onMouseDown={event => {
        event.preventDefault();
        toggleMark(editor as any, format);
      }}
    >
      {icon}
    </Button>
  );
};

const withMentions = (editor: ReactEditor) => {
  const { isInline, isVoid } = editor;

  editor.isInline = element => {
    return (element as any).type === 'mention' ? true : isInline(element);
  };

  editor.isVoid = element => {
    return (element as any).type === 'mention' ? true : isVoid(element);
  };

  return editor;
};

const insertMention = (editor: ReactEditor, character: string) => {
  //const mention: MentionElement = {
  //type: 'mention',
  //character,
  //children: [{ text: '' }],
  //};
  Transforms.insertText(editor, character);
  //Transforms.insertNodes(editor, mention);
  Transforms.move(editor);
};

/*
const initialValue = [
  {
    type: 'paragraph',
    children: [
      { text: 'This is editable ' },
      { text: 'rich', bold: true },
      { text: ' text, ' },
      { text: 'much', italic: true },
      { text: ' better than a ' },
      { text: '<textarea>', code: true },
      { text: '!' },
    ],
  },
  {
    type: 'paragraph',
    children: [
      {
        text:
          "Since it's rich text, you can do things like turn a selection of text ",
      },
      { text: 'bold', bold: true },
      {
        text:
          ', or add a semantically rendered block quote in the middle of the page, like this:',
      },
    ],
  },
  {
    type: 'block-quote',
    children: [{ text: 'A wise quote.' }],
  },
  {
    type: 'paragraph',
    children: [{ text: 'Try it out for yourself!' }],
  },
];
*/

export default Editor;
