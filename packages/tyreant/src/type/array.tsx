import * as React from 'react';

import { Tyr } from 'tyranid/client';

import { TyrLink } from './link';
import {
  byName,
  TyrTypeProps,
  mapDocumentValueToFormValue,
  mapFormValueToDocumentValue
} from './type';
import { TyrArrayKeyValue } from './array.key-value';
import { TyrArrayList } from './array.list';

export const TyrArray = (props: TyrTypeProps) => {
  const { path } = props;

  if (!props.document) throw new Error('no "document" passed to TyrArray');

  const { detail: field } = path;
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
      return <TyrArrayList {...props} />;
  }
};

byName.array = {
  component: TyrArray as Tyr.anny,
  mapDocumentValueToFormValue(path: Tyr.NamePathInstance, value: any) {
    const { detail: field } = path;
    // TODO:  remove slice when upgrading to mobx 5
    if (value && value.slice) value = value.slice();

    if (value) {
      value = (value as Tyr.anny[]).map(value =>
        mapDocumentValueToFormValue(path, value)
      );
    }

    return value;
  },
  mapFormValueToDocumentValue(path: Tyr.NamePathInstance, value: any) {
    if (value) {
      value = (value as Tyr.anny[]).map(value =>
        mapFormValueToDocumentValue(path, value)
      );
    }

    return value;
  }
};
