import * as React from 'react';

import { createForm } from '../core';

export const TyrRemove = createForm(
  {
    actions: [
      {
        traits: ['edit'],
        name: 'remove',
        action: () => {}
      },
      {
        traits: ['save'],
        name: 'remove',
        action: async ({ self, document }) => {
          await document!.$remove();
          self.parent?.requery();
        }
      }
    ]
  },
  ({}) => (
    <div className="tyr-import-help">
      Are you sure you want to remove this item?
    </div>
  )
);
