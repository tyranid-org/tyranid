import * as React from 'react';

import { Radio } from 'antd';

import { Tyr } from 'tyranid/client';

import { decorateField } from '../core';
import { onTypeChange } from './type';
import { TyrLinkAbstract } from './link.abstract';

export class TyrLinkRadio<
  D extends Tyr.Document = Tyr.Document
> extends TyrLinkAbstract<D> {
  render() {
    const jsx = super.render();
    if (jsx) return jsx;

    const { props, state } = this;
    const { documents } = state;

    return decorateField('link', props, () => (
      <Radio.Group
        name={props.path?.identifier}
        onChange={ev => {
          const { props } = this;
          const { value } = ev.target;
          onTypeChange(props, value, ev);
          this.props.onChange?.(value, ev, props);
        }}
      >
        {(props.optionFilter?.(documents) || documents).map(d => (
          <Radio key={d.$id} value={d.$id}>
            {d.$label}
          </Radio>
        ))}
      </Radio.Group>
    ));
  }
}
