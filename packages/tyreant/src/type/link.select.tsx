import * as React from 'react';

import { Select, Spin } from 'antd';
import { SelectProps, SelectValue } from 'antd/lib/select';
const { Option } = Select;

import { Tyr } from 'tyranid/client';

import { decorateField, labelFieldFromProps, labelFor } from '../core';
import { findByLabel, TyrLinkAbstract } from './link.abstract';

export class TyrLinkSelect<
  D extends Tyr.Document = Tyr.Document
> extends TyrLinkAbstract<D> {
  private renderOption = (val: Tyr.Document) => {
    const key = val.$id || labelFor(this.props, val);

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

                // NOTE:  if they use props.labelField then we are saving off a new record without a proper label
                label = await link.save({
                  [labelFieldFromProps(props) ||
                  link.labelField.pathName]: value,
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
            ? ({
                value: v.$id,
                label: labelFor(props, v as any),
                document: v,
              } as SelectValue)
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
