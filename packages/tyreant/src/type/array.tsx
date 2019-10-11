import * as React from 'react';

import { Tyr } from 'tyranid/client';

import { TyrLink } from './link';
import {
  byName,
  TyrTypeProps,
  mapDocumentValueToFormValue,
  withTypeContext,
  mapFormValueToDocument,
  mapFormValueToDocumentValue
} from './type';
import { TyrArrayKeyValue } from './array.key-value';
import { TyrArrayList } from './array.list';
import { TyrArrayFixed } from './array.fixed';

export const TyrArrayBase = (props: TyrTypeProps) => {
  const path = props.path!;

  if (!props.document) throw new Error('no "document" passed to TyrArray');

  const { tail: field } = path;
  switch (field.of!.type.name) {
    case 'link':
      return <TyrLink {...props} />;
    case 'object':
      const { keyField, valueField, fixedField } = props;
      if (keyField || valueField) {
        return <TyrArrayKeyValue {...props} />;
      } else if (fixedField) {
        return <TyrArrayFixed {...props} />;
      }
    // fall through

    default:
      return <TyrArrayList {...props} />;
  }
};

export const TyrArray = withTypeContext(TyrArrayBase);

byName.array = {
  component: TyrArray,
  mapDocumentValueToFormValue(path: Tyr.NamePathInstance, value: any) {
    // TODO:  remove slice when upgrading to mobx 5
    if (value && value.slice) value = value.slice();

    if (value) {
      value = (value as any[]).map((value, idx) =>
        mapDocumentValueToFormValue(path.walk(idx), value)
      );
    }

    return value;
  },
  mapFormValueToDocumentValue(
    path: Tyr.NamePathInstance,
    arrayValue: any[],
    props: TyrTypeProps
  ) {
    if (arrayValue) {
      return arrayValue.map((val, idx) =>
        mapFormValueToDocumentValue(path.walk(idx), val, props)
      );
    }

    return arrayValue;
  },

  mapFormValueToDocument(
    path: Tyr.NamePathInstance,
    arrayValue: any,
    document: Tyr.Document,
    props: TyrTypeProps
  ) {
    if (arrayValue) {
      // the form values don't represent the nested values as arrays
      // TODO:  do we need to figure out a way to store a length on the form array somewhere to account for a sparse
      //        array?  right now we're assuming it's a dense array and we stop as soon as we find an undefined element

      let v: any;

      /*
      let mappedArray = path.get(document);
      if (!mappedArray) {
        mappedArray = [];
        path.set(document, mappedArray);
      }
      */

      let i = 0;
      for (; (v = arrayValue[i]) !== undefined; i++) {
        mapFormValueToDocument(path.walk(i), v, document, props);
      }

      if (i === 0) {
        // TODO: do we need to remove the array from the document ?
      }
    } else {
      // TODO: do we need to remove the array from the document ?
    }
  }
};
