import * as React from 'react';
import { useEffect } from 'react';

import { Tyr } from 'tyranid/client';

import { byName, TyrTypeProps, mapPropsToForm, onTypeChange } from './type';
import { stringFilter, stringFinder } from './string';
import { withThemedTypeContext } from '../core/theme';
import { decorateField } from '../core';
import { registerComponent } from '../common';

import CKEditor from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

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
    if (editor) editor.setData(value);
  }, [editor]);

  return (
    <CKEditor
      editor={ClassicEditor}
      onInit={(editor: any) => {
        setEditor(editor);
      }}
      config={{
        placeholder: props.placeholder,
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
    />
  );
};

export const TyrTextBase = <D extends Tyr.Document = Tyr.Document>(
  props: TyrTypeProps<D>
) => {
  useEffect(() => mapPropsToForm(props), [props.path?.name]);

  return decorateField('text', props, () => <CKEditorWrapper props={props} />);
};

export const TyrText = withThemedTypeContext('text', TyrTextBase);

byName.text = {
  component: TyrTextBase,
  filter: stringFilter,
  finder: stringFinder,
};

registerComponent('TyrText', TyrText);

/*
import { Input } from 'antd';
const { TextArea } = Input;

<TextArea
placeholder={props.placeholder}
autoFocus={props.autoFocus}
onChange={ev => onTypeChange(props, ev.target.value, ev)}
tabIndex={props.tabIndex}
rows={props.textAreaRows || 6}
onPressEnter={props.onPressEnter}
/>
*/
