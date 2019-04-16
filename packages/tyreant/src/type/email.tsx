import * as React from 'react';

import { Input } from 'antd';

import { byName, generateRules, TyrTypeProps, className } from './type';
import { stringFilter, stringFinder } from './string';
import { withTypeContext } from './type';

export const TyrEmailBase = ((props: TyrTypeProps) => {
  const { field, form } = props;

  return form!.getFieldDecorator(field.path, {
    rules: generateRules(field),
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
  finder: stringFinder,
};
