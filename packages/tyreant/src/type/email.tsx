import * as React from 'react';
import { useEffect } from 'react';

import { Input } from 'antd';

import { byName, generateRules, TyrTypeProps, className } from './type';
import { stringFilter, stringFinder } from './string';
import { mapDocumentToForm, withTypeContext } from './type';

export const TyrEmailBase = ((props: TyrTypeProps) => {
  const { document, field, form } = props;

  useEffect(() => {
    mapDocumentToForm(field, document, form);
  });

  return form!.getFieldDecorator(field.path, {
    rules: generateRules(field)
  })(
    <Input
      className={className('tyr-email', props)}
      autoComplete="off"
      type="email"
    />
  );
}) as React.ComponentType<TyrTypeProps>;

export const TyrEmail = withTypeContext(TyrEmailBase);

byName.email = {
  component: TyrEmailBase,
  filter: stringFilter,
  finder: stringFinder
};
