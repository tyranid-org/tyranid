import * as React from 'react';

import { Tyr } from 'tyranid/client';
import { TyrTable, TyrModal } from '../core';
import { registerComponent } from '../common';

const { TyrImport } = Tyr.collections;

interface Props {
  onClose?: () => void;
}

export const TyrImports = (props: Props) => (
  <TyrTable
    collection={TyrImport}
    scroll={{ y: '400px' }}
    decorator={
      <TyrModal defaultOpen={true} className="tyr-wide-modal" title="Imports" />
    }
    paths={[
      { path: 'collectionName', label: 'Type' },
      { path: 'on', defaultSort: 'descend' },
      'endedAt',
      'issues',
    ]}
    export={false}
    actions={{
      close: {
        trait: 'cancel',
        align: 'right',
        on() {
          props.onClose?.();
        },
      },
    }}
  />
);

registerComponent('TyrImports', TyrImports);
