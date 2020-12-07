import * as React from 'react';
import { Tyr } from 'tyranid/client';

import { TyrActionFnOpts, TyrForm } from '../core';

export const TyrRemove = <D extends Tyr.Document>({
  hide,
}: {
  hide?: (opts: TyrActionFnOpts<D>) => boolean;
}) => (
  <TyrForm
    actions={[
      {
        trait: 'view',
        name: 'remove',
        ...(hide && { hide }),
      },
      {
        trait: 'save',
        name: 'remove',
        on: async ({ self, document }) => {
          await document!.$remove();
          self.parent?.requery();
        },
      },
    ]}
  >
    {({ document }) => (
      <div className="tyr-import-help">
        Are you sure you want to remove this {document.$model.label || 'item'} ?
      </div>
    )}
  </TyrForm>
);
