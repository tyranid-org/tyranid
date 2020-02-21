import * as React from 'react';
import { useEffect } from 'react';

import { Input } from 'antd';

import { Tyr } from 'tyranid/client';

import {
  byName,
  mapPropsToForm,
  TyrTypeProps,
  withTypeContext,
  onTypeChange
} from './type';
import { decorateField } from '../core';
import { registerComponent } from '../common';

const { TextArea } = Input;

const { TyrMarkupType } = Tyr.collections;

export const TyrMarkupBase = ((props: TyrTypeProps) => {
  useEffect(() => mapPropsToForm(props), [props.path && props.path.name]);

  return decorateField('string', props, () => {
    const onTypeChangeFunc = (ev: any) => {
      onTypeChange(props, ev.target.value, ev);
      props.onChange && props.onChange(ev.target.value, ev, props);
    };

    return (
      <TextArea
        autoComplete="off"
        autoFocus={props.autoFocus}
        placeholder={props.placeholder}
        onChange={onTypeChangeFunc}
        tabIndex={props.tabIndex}
        className={
          'tyr-markup-editor' + (props.className ? ' ' + props.className : '')
        }
      />
    );
  });
}) as React.ComponentType<TyrTypeProps>;

export const TyrMarkup = withTypeContext('markup', TyrMarkupBase);

byName.markup = {
  component: TyrMarkupBase,
  mapDocumentValueToFormValue(path: Tyr.NamePathInstance, value: Tyr.anny) {
    return value?.content || '';
  },
  mapFormValueToDocumentValue(path, value, props) {
    return { type: TyrMarkupType.HTML._id, content: value };
  }
};

registerComponent('TyrMarkup', TyrMarkup);
