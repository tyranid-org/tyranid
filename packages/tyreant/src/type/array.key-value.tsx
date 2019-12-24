import * as React from 'react';
import { useEffect, useState } from 'react';

import { TyrLink } from './link';
import { TyrTypeProps, getTypeValue, TypeContext } from './type';
import { SelectValue, LabeledValue } from 'antd/lib/select';

/**
 * This control renders an array as a key - value editor
 */
export const TyrArrayKeyValue = (props: TyrTypeProps) => {
  const { document, form, path, children } = props;
  const { tail: field } = path!;

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

  const keyPath = path!.walk(keyFieldName);
  const keyField = keyPath.tail;
  const keyFieldLink = keyField.link;
  if (!keyFieldLink) throw new Error('"keyField" must be a link field');

  const [valueSubPath, setValueSubPath] = useState<string | undefined>(
    undefined
  );

  const selectKeyValue = (selectedKey: any) => {
    let ai = 0;
    for (; ai < array.length; ai++) {
      const arrayEl = array[ai];
      const key = arrayEl[keyFieldName];
      if (key === undefined) {
        // this is ours, claim it
        arrayEl[keyFieldName] = key;
        break;
      }

      if (key === selectedKey) {
        break;
      }
    }

    if (ai === array.length) {
      array.push({
        [keyFieldName]: selectedKey
      });
    }

    setValueSubPath(ai + '.' + valueFieldName);

    setKeyValue({ value: selectedKey });

    form.setFieldsValue({
      //{
      [keyPath.identifier]:
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
    }, [path!.name]);
  }

  const [keyValue, setKeyValue] = useState<{ value?: any }>({
    value: undefined
  });

  const onSelect = (
    selectedValue: SelectValue
    //option: React.ReactElement<any>
  ) => selectKeyValue((selectedValue as LabeledValue).key || selectedValue);

  const childProps = {
    ...props,
    path: valueSubPath && path!.walk(valueSubPath!)
  };

  return (
    <>
      <TyrLink
        className={props.keyFieldClass}
        path={keyPath}
        value={keyValue}
        form={form}
        onSelect={onSelect}
      />
      {valueSubPath && (
        <TypeContext.Provider value={childProps as TyrTypeProps}>
          {children}
        </TypeContext.Provider>
      )}
    </>
  );
};
