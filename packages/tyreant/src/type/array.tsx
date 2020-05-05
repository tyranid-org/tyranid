import * as React from 'react';

import { Tyr } from 'tyranid/client';

import { TyrLink } from './link';
import {
  byName,
  TyrTypeProps,
  mapDocumentValueToFormValue,
  mapFormValueToDocument,
  mapFormValueToDocumentValue,
  getCellValue,
  getFinder,
} from './type';
import { TyrArrayKeyValue } from './array.key-value';
import { TyrArrayList } from './array.list';
import { TyrArrayFixed } from './array.fixed';
import { registerComponent } from '../common';
import { withThemedTypeContext } from '../core/theme';
import { propagateMaybeChanged } from 'mobx/lib/internal';

export const TyrArrayBase = <D extends Tyr.Document = Tyr.Document>(
  props: TyrTypeProps<D>
) => {
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

export const TyrArray = withThemedTypeContext('array', TyrArrayBase);

byName.array = {
  component: TyrArray,
  mapDocumentValueToFormValue(path, value, props) {
    // TODO:  remove slice when upgrading to mobx 5
    if (value && value.slice) value = value.slice();

    if (value) {
      value = (value as any[]).map((value, idx) =>
        mapDocumentValueToFormValue(path.walk(idx), value, props)
      );
    }

    return value;
  },
  mapFormValueToDocumentValue(path, arrayValue: any[], props) {
    if (arrayValue) {
      return arrayValue.map((val, idx) =>
        mapFormValueToDocumentValue(path.walk(idx), val, props)
      );
    }

    return arrayValue;
  },
  mapFormValueToDocument(path, arrayValue, document, props) {
    if (arrayValue) {
      // the form values don't represent the nested values as arrays
      // TODO:  do we need to figure out a way to store a length on the form array somewhere to account for a sparse
      //        array?  right now we're assuming it's a dense array and we stop as soon as we find an undefined element

      const { tail: field } = path;
      if (field.def.set) {
        // This is a computed array which means we cannot walk it's values below and instead need to assign it here

        path.set(
          document,
          arrayValue.map((v: any) =>
            mapFormValueToDocumentValue(path.walk('_'), v, props)
          )
        );
      } else {
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
      }
    } else {
      // TODO: do we need to remove the array from the document ?
    }
  },
  filter(component, props) {
    const path = props.path!;
    const { tail } = path;

    if (tail.of!.link) {
      return byName.link.filter!(component, props);
    } else {
      // TODO as needed
      return undefined;
    }
  },
  finder(path, opts, searchValue) {
    const childPath = path.walk('_');

    const finder = getFinder(childPath);

    if (finder) finder(childPath, opts, searchValue);
  },
  cellValue: (path, document, props) => {
    const arr = path.get(document);

    if (Array.isArray(arr)) {
      return arr
        .map((val, idx) => getCellValue(path.walk(idx), document, props))
        .join(', ');
    } else {
      return arr;
    }
  },
};

registerComponent('TyrArray', TyrArray);
