import * as React from 'react';
import { Tyr } from 'tyranid/client';

import { createForm, TyrActionFnOpts } from '../core';

export const TyrRemove = createForm<
  Tyr.Document,
  { onHide: (opts: TyrActionFnOpts<Tyr.Document>) => boolean }
>(
  {
    actions: [
      {
        trait: 'view',
        name: 'remove',
        // hide: (opts) => {
        //   return false
        // }
      },
      {
        trait: 'save',
        name: 'remove',
        on: async ({ self, document }) => {
          await document!.$remove();
          self.parent?.requery();
        },
      },
    ],
  },
  ({ document }) => (
    <div className="tyr-import-help">
      Are you sure you want to remove this {document.$model.label || 'item'} ?
    </div>
  )
);
