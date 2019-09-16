import * as React from 'react';
import { useEffect } from 'react';

import { Input } from 'antd';

import {
  byName,
  generateRules,
  TyrTypeProps,
  className,
  mapPropsToForm
} from './type';
import { stringFilter, stringFinder } from './string';
import { withTypeContext } from './type';

export const TyrEmailBase = ((props: TyrTypeProps) => {
  const { path, form } = props;

  useEffect(() => {
    mapPropsToForm(props);
  }, []);

  return form!.getFieldDecorator(path.name, {
    rules: generateRules(props)
  })(
    <Input
      className={className('tyr-email', props)}
      autoComplete="off"
      type="email"
      placeholder={props.placeholder}
      autoFocus={props.autoFocus}
    />
  );
}) as React.ComponentType<TyrTypeProps>;

export const TyrEmail = withTypeContext(TyrEmailBase);

byName.email = {
  component: TyrEmailBase,
  filter: stringFilter,
  finder: stringFinder
};
