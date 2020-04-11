import * as React from 'react';
import { useEffect } from 'react';

import { Tyr } from 'tyranid/client';

import { byName, TyrTypeProps, mapPropsToForm, onTypeChange } from './type';
import { decorateField, TyrRouter } from '../core';
import { registerComponent } from '../common';
import { withThemedTypeContext } from '../core/theme';

export const TyrUidBase = <D extends Tyr.Document = Tyr.Document>(
  props: TyrTypeProps<D>
) => {
  useEffect(() => mapPropsToForm(props), [props.path?.name]);

  return decorateField('uid', props, () => {
    // const onTypeChangeFunc = (ev: any) => {
    //   onTypeChange(props, ev.target.value, ev);
    //   props.onChange && props.onChange(ev.target.value, ev, props);
    // };

    return <div>TODO: uid</div>;
  });
};

export const TyrUid = withThemedTypeContext('uid', TyrUidBase);

byName.uid = {
  component: TyrUidBase,
};

registerComponent('TyrUid', TyrUid);
