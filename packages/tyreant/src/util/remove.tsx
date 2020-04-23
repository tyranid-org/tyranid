import * as React from 'react';

import { createForm } from '../core';

export const TyrRemove = createForm(
  {
    actions: [
      {
        trait: 'view',
        name: 'remove',
      },
      {
        trait: 'save',
        name: 'remove',
        on: async ({ self, document }) => {
          await document!.$remove();
          self.parent?.query();
        },
      },
    ],
  },
  ({}) => (
    <div className="tyr-import-help">
      Are you sure you want to remove this item?
    </div>
  )
);
