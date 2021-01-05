import * as React from 'react';
import { useEffect } from 'react';

import { Input, Popover } from 'antd';

import { Tyr } from 'tyranid/client';

import { byName, TyrTypeProps, mapPropsToForm, onTypeChange } from './type';
import { withThemedTypeContext } from '../core/theme';
import { decorateField, getValue } from '../core';
import { registerComponent } from '../common';

import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
//import ClassicEditor from 'ckeditor5-custom-build';

const { TextArea } = Input;

const CKEditorWrapper = <D extends Tyr.Document = Tyr.Document>({
  value = {},
  onChange,
  props,
}: {
  value?: any;
  onChange?: any;
  props: TyrTypeProps<D>;
}) => {
  const [editor, setEditor] = React.useState<any>();

  React.useEffect(() => {
    if (editor) {
      editor.setData(value);
    }
  }, [editor]);

  return (
    <CKEditor
      editor={ClassicEditor}
      onReady={(editor: any) => {
        setEditor(editor);
      }}
      config={{
        placeholder: props.placeholder,
        allowedContent: 'true',
        removeFormatTags: '',
        //...(props.mentionFeeds ? { plugins: [Mention] } : {}),
      }}
      onChange={(event: any, editor: any) => {
        const data = editor.getData();
        onTypeChange(props, data, event);
        onChange({ ...value, ...data });
      }}
      onBlur={(event: any, editor: any) => {
        //console.log('Blur.', editor);
      }}
      onFocus={(event: any, editor: any) => {
        //console.log('Focus.', editor);
      }}
      mention={
        props.mentionFeeds
          ? {
              mention: {
                feeds: [props.mentionFeeds],
              },
            }
          : undefined
      }
    />
  );
};

export const TyrTextBase = <D extends Tyr.Document = Tyr.Document>(
  props: TyrTypeProps<D>
) => {
  useEffect(() => mapPropsToForm(props), [props.path?.name]);

  return decorateField('text', props, () => {
    switch (props.as) {
      case 'textarea':
        return (
          <TextArea
            placeholder={props.placeholder}
            autoFocus={props.autoFocus}
            onChange={ev => onTypeChange(props, ev.target.value, ev)}
            tabIndex={props.tabIndex}
            rows={props.textAreaRows || 6}
            onPressEnter={props.onPressEnter}
          />
        );

      default:
        return <CKEditorWrapper props={props} />;
    }
  });
};

export const TyrText = withThemedTypeContext('text', TyrTextBase);

type TextPopoverProps = {
  value: string;
  title?: React.ReactNode | string;
};

const TextPopover = ({ value, title }: TextPopoverProps) => (
  <Popover
    placement="left"
    content={
      <div
        style={{
          maxHeight: '300px',
          maxWidth: '300px',
          overflow: 'auto',
        }}
      >
        <div dangerouslySetInnerHTML={{ __html: value }} />
      </div>
    }
    title={title}
  >
    <div
      className="__cl-raw-html"
      dangerouslySetInnerHTML={{ __html: value }}
    />
  </Popover>
);

byName.text = {
  extends: 'string',
  component: TyrTextBase,
  cellValue(path, document, props) {
    const value = getValue(props, document);

    if (props.as === 'textarea') {
      return <>{value}</>;
    }

    return (
      <div className="tyr-rich-text-cell">
        <TextPopover value={(value as string) || ''} />
      </div>
    );

    // ellipsis: true,
    // defaultHidden: true,
  },
  //static: {
  //<div>whatever</div>
  //}
};

registerComponent('TyrText', TyrText);
