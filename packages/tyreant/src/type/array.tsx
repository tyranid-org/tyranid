import * as React from 'react';

import { Tyr } from 'tyranid/client';

//import { WrappedFormUtils } from 'antd/lib/form/Form';

import { TyrLink } from './link';
import {
  byName,
  TyrTypeProps,
  mapDocumentValueToFormValue,
  mapFormValueToDocumentValue
} from './type';
import { TyrArrayKeyValue } from './array.key-value';

export const TyrArray = (props: TyrTypeProps) => {
  const { field } = props;

  if (!props.document) throw new Error('no "document" passed to TyrArray');

  switch (field.of!.type.name) {
    case 'link':
      return <TyrLink {...props} />;
    case 'object':
      const { keyField: keyFieldName, valueField: valueFieldName } = props;
      if (keyFieldName || valueFieldName) {
        return <TyrArrayKeyValue {...props} />;
      }
    // fall through

    default:
      return <div>TODO: array of {field.type.name}</div>;
  }

  //return form.getFieldDecorator(field.path, {
  //rules: generateRules(field),
  //})(<Input autoComplete="off" type="email" />);
};

byName.array = {
  component: TyrArray as Tyr.anny,
  mapDocumentValueToFormValue(field: Tyr.FieldInstance, value: Tyr.anny) {
    // TODO:  remove slice when upgrading to mobx 5
    if (value && value.slice) value = value.slice();

    if (value) {
      value = (value as Tyr.anny[]).map(value =>
        mapDocumentValueToFormValue(field.of!, value)
      );
    }

    return value;
  },
  mapFormValueToDocumentValue(field: Tyr.FieldInstance, value: Tyr.anny) {
    if (value) {
      value = (value as Tyr.anny[]).map(value =>
        mapFormValueToDocumentValue(field.of!, value)
      );
    }

    return value;
  }
};
