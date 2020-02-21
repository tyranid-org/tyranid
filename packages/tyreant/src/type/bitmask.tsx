import * as React from 'react';
import { useEffect } from 'react';

import Checkbox from 'antd/es/checkbox';

import { byName, TyrTypeProps, onTypeChange, mapPropsToForm } from './type';
import { withTypeContext } from './type';
import { decorateField } from '../core';
import { registerComponent } from '../common';

export const TyrBitmaskBase = ((props: TyrTypeProps) => {
  useEffect(() => mapPropsToForm(props), [props.path && props.path.name]);

  return decorateField('bitmask', props, () => (
    <Checkbox.Group
      options={props.path!.tail.link!.values.map(value => ({
        label: value.$label,
        value: value.$id
      }))}
      onChange={e => onTypeChange(props, e, e)}
    />
  ));
}) as React.ComponentType<TyrTypeProps>;

export const TyrBitmask = withTypeContext('bitmask', TyrBitmaskBase);

const invert = (v: number) => ~v >>> 0;

byName.bitmask = {
  component: TyrBitmaskBase,
  mapDocumentValueToFormValue(path, value, props) {
    const arr = [],
      field = path.tail;

    if (field.def.inverse) value = invert(value);

    for (const doc of field.link!.values) {
      const { $id } = doc;
      const checked = (value & (1 << (($id as number) - 1))) !== 0x0;

      if (checked) arr.push($id);
    }

    return arr;
  },
  mapFormValueToDocumentValue(path, value, props) {
    const invertNeeded = path.tail.def.inverse;

    if (Array.isArray(value)) {
      let mask = 0x0;

      for (const v of value) {
        mask |= 1 << ((v as number) - 1);
      }

      return invertNeeded ? invert(mask) : mask;
    } else {
      return invertNeeded ? invert(0x0) : 0x0;
    }
  }
};

registerComponent('TyrBitmask', TyrBitmask);
