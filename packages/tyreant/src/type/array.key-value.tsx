import * as React from 'react';
import { useEffect, useState } from 'react';

import { Tyr } from 'tyranid/client';

import { TyrLink } from './link';
import { TyrTypeProps, getTypeValue, TypeContext } from './type';
import { SelectedValue, LabeledValue } from 'antd/lib/select';

/**
 * This control renders an array as a key - value editor
 */
export const TyrArrayKeyValue = (props: TyrTypeProps) => {
  const { document, form, path, children } = props;
  const { tail: field } = path;

  const {
    keyField: keyFieldName,
    valueField: valueFieldName,
    keyFieldDefault: keyFieldDefaultLabel
  } = props;
  if (!keyFieldName || !valueFieldName)
    throw new Error(
      'both "keyField" and "valueField" must be specified for TyrArrayKeyValue controls'
    );

  const ofField = field.of!;
  if (ofField.type.name !== 'object')
    throw new Error('TyrArrayKeyValue controls require an array of objects');

  const array = getTypeValue(props, []) as any[];

  const keyPath = path.walk(keyFieldName);
  const keyField = keyPath.tail;
  const keyFieldLink = keyField.link;
  if (!keyFieldLink) throw new Error('"keyField" must be a link field');

  const [valuePath, setValuePath] = useState<Tyr.NamePathInstance | undefined>(
    undefined
  );

  const selectKeyValue = (selectedKey: any) => {
    let ai = 0;
    for (; ai < array.length; ai++) {
      const arrayEl = array[ai];
      const key = arrayEl[keyFieldName];

      if (key === selectedKey) {
        break;
      }
    }

    if (ai === array.length) {
      array.push({
        [keyFieldName]: selectedKey
      });
    }

    setValuePath(path.walk(ai + '.' + valueFieldName));

    setKeyValue({ value: selectedKey });

    form.setFieldsValue({
      //{
      [keyPath.name]:
        //key: selectedKey, label:
        keyFieldLink.byIdIndex[selectedKey].$label
      //}
    });
  };

  if (keyFieldDefaultLabel) {
    useEffect(() => {
      (async () => {
        const labels = await keyField.labels(document!, keyFieldDefaultLabel);
        if (labels.length) {
          selectKeyValue(labels[0].$id);
        }
      })();
    }, []);
  }

  const [keyValue, setKeyValue] = useState<{ value?: any }>({
    value: undefined
  });

  const onSelect = (
    selectedValue: SelectedValue
    //option: React.ReactElement<any>
  ) => selectKeyValue((selectedValue as LabeledValue).key);

  const childProps = {
    ...props,
    path: valuePath!
  };

  return (
    <>
      <div className="tyr-labeled-field">
        <label>{keyField.label}</label>
        <TyrLink
          path={keyPath}
          value={keyValue}
          form={form}
          onSelect={onSelect}
        />
      </div>
      {valuePath && (
        <TypeContext.Provider value={childProps}>
          {children}
        </TypeContext.Provider>
      )}
    </>
  );
};
