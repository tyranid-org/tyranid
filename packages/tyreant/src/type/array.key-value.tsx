import * as React from 'react';
import { useEffect, useState } from 'react';

import { Tyr } from 'tyranid/client';

import { TyrLink } from './link';
import { TyrTypeProps, getTypeValue } from './type';
import { TyrField } from '../core';
import { SelectedValue } from 'antd/lib/select';

/**
 * This control renders an array as a key - value editor
 */
export const TyrArrayKeyValue = (props: TyrTypeProps) => {
  const { document, form, path } = props;
  const { detail: field } = path;
  const { collection } = field;

  const { keyField: keyFieldName, valueField: valueFieldName } = props;
  if (!keyFieldName || !valueFieldName)
    throw new Error(
      'both "keyField" and "valueField" must be specified for TyrArrayKeyValue controls'
    );

  const ofField = field.of!;
  if (ofField.type.name !== 'object')
    throw new Error('TyrArrayKeyValue controls require an array of objects');

  const array = getTypeValue(props, []) as any[];

  const keyPath = collection.parsePath(path.name + '.' + keyFieldName);
  const keyField = keyPath.detail;
  if (!keyField.link) throw new Error('"keyField" must be a link field');

  const [valuePath, setValuePath] = useState<Tyr.NamePathInstance | undefined>(
    undefined
  );

  //useEffect(() => {
  //mapDocumentToForm(path, document, form);
  //}, []);

  const [keyValue, setKeyValue] = useState<{ value?: any }>({
    value: undefined
  });

  const onSelect = (
    selectedValue: SelectedValue,
    option: React.ReactElement<any>
  ) => {
    console.log('selected', selectedValue, 'option', option);

    let ai = 0;
    for (; ai < array.length; ai++) {
      const arrayEl = array[ai];
      const key = arrayEl[keyFieldName];

      if (key === selectedValue) {
        break;
      }
    }

    if (ai === array.length) {
      array.push({
        [keyFieldName]: selectedValue
      });
    }

    const valueNamePath = collection.parsePath(
      field.path + '.' + ai + '.' + valueFieldName
    );

    // call setValueField
  };

  return (
    <>
      <TyrLink
        path={keyPath}
        value={keyValue}
        form={form}
        onSelect={onSelect}
      />
      {valuePath && (
        <TyrField document={document} form={form} path={valuePath} />
      )}
    </>
  );
};
