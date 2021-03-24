import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';

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
} from 'slate';
import { Editable, withReact, useSlate, Slate, ReactEditor } from 'slate-react';
import { withHistory } from 'slate-history';
import isHotkey from 'is-hotkey';

import { htmlToSlate, slateToHtml } from './slate-serialization';

const HOTKEYS: { [hotkey: string]: string } = {
  'mod+b': 'bold',
  'mod+i': 'italic',
  'mod+u': 'underline',
  'mod+`': 'code',
};

const LIST_TYPES = ['numbered-list', 'bulleted-list'];

export const TextEditor = ({
  value,
  onChange,
}: {
  value?: string;
  onChange?: (value: string) => void;
}) => {
  const editValue = useMemo(() => htmlToSlate(value ?? '') as Node[], [value]);

  const renderElement = useCallback(props => <Element {...props} />, []);
  const renderLeaf = useCallback(props => <Leaf {...props} />, []);
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);

  return (
    <div className="tyr-slate-editor">
      <Slate
        editor={editor}
        value={editValue}
        onChange={value => {
          //setEditValue(value);
          //const s = slateToHtml(value);
          onChange?.(slateToHtml(value));
        }}
      >
        <div className="tyr-slate-toolbar">
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
          onKeyDown={(event: any) => {
            for (const hotkey in HOTKEYS) {
              if (isHotkey(hotkey, event)) {
                event.preventDefault();
                const mark = HOTKEYS[hotkey];
                toggleMark(editor, mark);
              }
            }
          }}
        />
      </Slate>
    </div>
  );
};

const toggleBlock = (editor: ReactEditor, format: string) => {
  const isActive = isBlockActive(editor, format);
  const isList = LIST_TYPES.includes(format);

  Transforms.unwrapNodes(editor, {
    match: n =>
      LIST_TYPES.includes(
        (!Editor.isEditor(n) && SlateElement.isElement(n) && n.type) as string
      ),
    split: true,
  });
  const newProperties: Partial<SlateElement> = {
    type: isActive ? 'paragraph' : isList ? 'list-item' : format,
  };
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
      !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === format,
  });

  return !!match;
};

const isMarkActive = (editor: ReactEditor, format: string) => {
  const marks = Editor.marks(editor);
  return marks ? marks[format] === true : false;
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
  if (leaf.bold) {
    children = <strong>{children}</strong>;
  }

  if (leaf.code) {
    children = <code>{children}</code>;
  }

  if (leaf.italic) {
    children = <em>{children}</em>;
  }

  if (leaf.underline) {
    children = <u>{children}</u>;
  }

  return <span {...attributes}>{children}</span>;
};

const BlockButton = ({
  format,
  icon,
}: {
  format: string;
  icon: JSX.Element;
}) => {
  const editor = useSlate();
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
      className={isMarkActive(editor, format) ? 'tyr-active' : ''}
      onMouseDown={event => {
        event.preventDefault();
        toggleMark(editor, format);
      }}
    >
      {icon}
    </Button>
  );
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
