import * as React from 'react';
import { useEffect } from 'react';

import { TyrLink } from './link';
import { TyrTypeProps, mapDocumentToForm } from './type';
import { TyrField } from '../core';

export const TyrArrayKeyValue = (props: TyrTypeProps) => {
  const { document, field, form } = props;

  const { keyField: keyFieldName, valueField: valueFieldName } = props;
  if (!keyFieldName || !valueFieldName)
    throw new Error(
      'both "keyField" and "valueField" must be specified for TyrArrayKeyValue controls'
    );

  const ofField = field.of!;
  if (ofField.type.name !== 'object')
    throw new Error('TyrArrayKeyValue controls require an array of objects');

  const keyField = ofField.fields![keyFieldName];
  if (!keyField.link) throw new Error('"keyField" must be a link field');

  const valueField = ofField.fields![valueFieldName];

  useEffect(() => {
    mapDocumentToForm(field, document, form);
  });

  return (
    <>
      <TyrLink document={document} form={form} field={keyField} />
      <TyrField document={document} form={form} field={valueField} />
    </>
  );
};
