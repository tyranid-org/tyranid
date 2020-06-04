import * as React from 'react';

import { Tyr } from 'tyranid/client';

// TODO:  is it possible to import this via tsconfig ?
import 'tyranid/builtin/isomorphic';
import 'tyranid/builtin/client';

import { TyrTable } from '../core';
import { registerComponent } from '../common';

const { TyrJob } = Tyr.collections;

export const TyrJobAdmin = () => (
  <TyrTable
    collection={TyrJob}
    paths={[
      {
        path: 'collection',
        renderDisplay: job =>
          job.collection ? Tyr.byId[job.collection].label : 'n/a',
      },
      'service',
      'queuedAt',
      'startedAt',
      'endedAt',
      'canceled',
      'exception',
    ]}
    actions={{
      cancel: {
        async on({ document }) {
          document.canceled = true;
          await document.$update({ fields: { canceled: 1 } });
          await document.$setup({ canceled: true });
        },
      },
    }}
  ></TyrTable>
);

registerComponent('TyrJobAdmin', TyrJobAdmin);
