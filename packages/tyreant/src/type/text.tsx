import * as React from 'react';
import { useEffect } from 'react';

import { Input, Popover } from 'antd';

import { Tyr } from 'tyranid/client';

import { byName, TyrTypeProps, mapPropsToForm, onTypeChange } from './type';
import { withThemedTypeContext } from '../core/theme';
import { decorateField, getValue } from '../core';
import { registerComponent } from '../common';
import { TextEditor } from '../editor/editor';

const { TextArea } = Input;

export const TyrTextBase = <D extends Tyr.Document = Tyr.Document>(
  props: TyrTypeProps<D>
) => {
  useEffect(() => mapPropsToForm(props), [props.path?.name, props.document]);

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
        return <TextEditor onChange={s => onTypeChange(props, s, s)} />;
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
