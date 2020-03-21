import * as React from 'react';
import { useEffect } from 'react';

import { byName, TyrTypeProps, mapPropsToForm, onTypeChange } from './type';
import { decorateField } from '../core';
import { registerComponent } from '../common';
import { withThemedTypeContext } from '../core/theme';

export const TyrUidBase = ((props: TyrTypeProps) => {
  useEffect(() => mapPropsToForm(props), [props.path?.name]);

  return decorateField('uid', props, () => {
    // const onTypeChangeFunc = (ev: any) => {
    //   onTypeChange(props, ev.target.value, ev);
    //   props.onChange && props.onChange(ev.target.value, ev, props);
    // };

    return <div>TODO: uid</div>;
  });
}) as React.ComponentType<TyrTypeProps>;

export const TyrUid = withThemedTypeContext('uid', TyrUidBase);

byName.uid = {
  component: TyrUidBase
};

registerComponent('TyrUid', TyrUid);
