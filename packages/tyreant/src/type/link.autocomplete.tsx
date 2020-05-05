import * as React from 'react';

import { AutoComplete, Spin } from 'antd';

import { Tyr } from 'tyranid/client';

import { decorateField } from '../core';
import { TyrLinkAbstract } from './link.abstract';

export class TyrLinkAutoComplete<
  D extends Tyr.Document = Tyr.Document
> extends TyrLinkAbstract<D> {
  value: string | { key: string; value: string } | undefined;

  render() {
    const jsx = super.render();
    if (jsx) return jsx;

    const { props } = this;
    const { /*path, */ component, document } = props;
    const { documents, loading } = this.state;

    /**
     * link.autocomplete is currently only used when a TyrLink is added to an _id field.
     * In this case it behaves like a "finder" ... when you find a link, it loads that document into
     * the current form and becomes read-only.  It's probable that there are other uses of an autocomplete
     * on a link control and when that happens we'll need to have a mode that this autocomplete is working
     * under.
     */
    //const opMode = 'id'; //path?.name === '_id';

    if (/*opMode === 'id' && */ document && !document.$isNew) {
      return decorateField('link', props, () => (
        <span className="tyr-value">{document.$label}</span>
      ));
    }

    return decorateField('link', props, () => (
      <AutoComplete
        {...{
          options: (props.optionFilter
            ? props.optionFilter(documents)
            : documents
          ).map(d => ({ key: d.$id, value: d.$label })),
          notFoundContent: loading ? (
            <Spin size="small" style={{ position: 'static' }} />
          ) : null,

          onChange: ((
            value: string,
            option: { key: string; value: string }
          ) => {
            //if (opMode === 'id') {
            if (option.key) {
              // they either entered in a string which matches an existing option or they selected a value
              this.value = option;
            } else {
              // they entered in a new string that does not match an existing option
              this.value = value;
              document?.$model.labelField?.path.set(document, value);
            }
            //} else {
            //throw new Tyr.AppError('autocomplete mode not supported yet');
            //}
          }) as any, // ant types are wrong
          onSelect: ((
            value: string,
            option: { key: string; value: string }
          ) => {
            props.onSelect?.(value, option);
            /*if (opMode === 'id') */ component?.findById(option.key as any);
          }) as any, // ant types are wrong
          onSearch: this.search,
          onKeyDown: (event: any) => {
            //if (opMode === 'id') {
            switch (event.key) {
              case 'Enter':
              case 'Tab':
                const { value } = this;

                if (value) {
                  if (typeof value === 'object') {
                    component?.findById(value.key as any);
                  } else {
                    document?.$model.labelField?.path.set(document, value);
                  }
                }
            }
            //}
          },
          allowClear: props.allowClear,
          autoFocus: props.autoFocus,
          className: props.className,
          dropdownClassName: props.dropdownClassName,
          filterOption: false,
          placeholder: props.placeholder,
          tabIndex: props.tabIndex,
        }}
      />
    ));
  }
}
