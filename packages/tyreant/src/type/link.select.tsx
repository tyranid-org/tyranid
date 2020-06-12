import * as React from 'react';

import { Select, Spin } from 'antd';
import { SelectProps, SelectValue } from 'antd/lib/select';
const { Option } = Select;

import { Tyr } from 'tyranid/client';

import { decorateField } from '../core';
import { findByLabel, TyrLinkAbstract } from './link.abstract';

export class TyrLinkSelect<
  D extends Tyr.Document = Tyr.Document
> extends TyrLinkAbstract<D> {
  private renderOption = (val: Tyr.Document) => {
    const { $label, $id } = val;

    const key = $id || $label;

    return (
      <Option key={key} value={key}>
        {this.renderLabel(val)}
      </Option>
    );
  };

  render() {
    const jsx = super.render();
    if (jsx) return jsx;

    const { props } = this;
    const { onSelect, onDeselect } = props;
    const { documents, loading, initialLoading } = this.state;

    const selectProps: SelectProps<Tyr.AnyIdType | Tyr.AnyIdType[]> = {
      mode: this.mode,
      labelInValue: !!props.labelInValue,
      notFoundContent: loading ? (
        <Spin size="small" style={{ position: 'static' }} />
      ) : null,
      showSearch: true,
      onSearch: this.search,
      placeholder: this.props.placeholder,
      onDeselect,
      autoFocus: this.props.autoFocus,
      tabIndex: this.props.tabIndex,
      className: this.props.className,
      dropdownClassName: this.props.dropdownClassName,
      filterOption: false,
      loading: !!initialLoading,
      allowClear: this.props.allowClear,
    };

    selectProps.onChange = async value => {
      const link = this.link!;

      if (this.mode === 'tags' && link.def.tag) {
        const values = value as string[];
        const { onStateChange } = this.props;

        await Promise.all(
          values.map(async value => {
            let label = (this.link as any).byIdIndex[value];

            if (!label) {
              label = findByLabel(props, this.link!, value);

              if (!label) {
                onStateChange?.({ ready: false });

                label = await link.save({
                  [link.labelField.pathName]: value,
                });

                label.$cache();
                onStateChange?.({ ready: true });
              }
            }
          })
        );
      }

      this.onTypeChangeFunc(value);
      this.search('');
    };

    if (onSelect) {
      selectProps.onSelect = (value: SelectValue, option: any) => {
        const v = findByLabel(props, this.link!, value as string);

        onSelect(
          v
            ? ({ value: v.$id, label: v.$label, document: v } as SelectValue)
            : value,
          option
        );
      };
    }

    if (this.state.initialLoading || !documents) return <></>;

    return decorateField('link', props, () => (
      <Select {...selectProps}>
        {(props.optionFilter ? props.optionFilter(documents) : documents).map(
          this.renderOption
        )}
      </Select>
    ));
  }
}
