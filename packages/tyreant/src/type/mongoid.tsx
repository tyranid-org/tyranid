import * as React from 'react';
import { useEffect } from 'react';

import { Input } from 'antd';

import { Tyr } from 'tyranid/client';

import { mapPropsToForm, onTypeChange } from './type';
import { byName, TyrTypeProps } from './type';
import { decorateField } from '../core';
import { registerComponent } from '../common';
import { withThemedTypeContext } from '../core/theme';

export const TyrMongoIdBase = <D extends Tyr.Document = Tyr.Document>(
  props: TyrTypeProps<D>
) => {
  useEffect(() => mapPropsToForm(props), [
    props.path && props.path.name,
    props.document,
  ]);

  // TODO:  possibly return TyrLink out of this in some instances?
  return decorateField('mongoid', props, () => {
    return (
      <Input
        {...(props.searchRange
          ? {
              min: props.searchRange[0] as number,
              max: props.searchRange[1] as number,
            }
          : {})}
        onChange={ev => onTypeChange(props, ev, undefined)}
        placeholder={props.placeholder}
        tabIndex={props.tabIndex}
      />
    );
  });
};

export const TyrMongoId = withThemedTypeContext('mongoid', TyrMongoIdBase);

byName.mongoid = {
  component: TyrMongoIdBase,
};

registerComponent('TyrMongoId', TyrMongoId);
