import * as React from 'react';

import { Tyr } from 'tyranid/client';
import { TyrTable, TyrModal } from '../core';
import { registerComponent } from '../common';

const { TyrImport } = Tyr.collections;

export const TyrImports = () => (
  <TyrTable
    collection={TyrImport}
    decorator={
      <TyrModal defaultOpen={true} className="tyr-wide-modal" title="Imports" />
    }
    paths={[
      { path: 'collectionName', label: 'Name' },
      'on',
      'endedAt',
      'issues',
    ]}
    export={false}
  />
);

registerComponent('TyrImports', TyrImports);
