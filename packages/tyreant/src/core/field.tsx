import * as React from 'react';

import { assertTypeUi, TyrTypeProps, withTypeContext } from '../type/type';

export const TyrFieldBase = ((props: TyrTypeProps) => {
  const { field } = props;
  const { type } = field;
  const typeUi = assertTypeUi(type.name);
  return React.createElement(typeUi.component, props);
}) as React.ComponentType<TyrTypeProps>;

export const TyrField = withTypeContext(TyrFieldBase);
