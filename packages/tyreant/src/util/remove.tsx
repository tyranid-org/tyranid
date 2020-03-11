import * as React from 'react';

import { TyrForm, TyrModal, createForm } from '../core';

export const TyrRemove = createForm(
  {
    decorator: <TyrModal />,
    actions: [
      {
        traits: ['edit'],
        name: 'remove'
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
  ({ document }) => {
    return (
      <>
        <div className="tyr-import-help">
          Are you sure you want to remove this item?
        </div>
      </>
    );
  }
);
