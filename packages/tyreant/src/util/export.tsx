import * as React from 'react';

import { Tyr } from 'tyranid/client';
import { TyrTable, TyrModal } from '../core';
import { registerComponent } from '../common';
import { TyrRemove } from './remove';

const { TyrExport } = Tyr.collections;

const CF_PREFIX = (Tyr.options as any).aws?.cloudfrontPrefix || '';

interface Props {
  onClose?: () => void;
}

export const TyrExports = (props: Props) => (
  <TyrTable
    collection={TyrExport}
    scroll={{ y: '400px' }}
    decorator={
      <TyrModal defaultOpen={true} className="tyr-wide-modal" title="Exports" />
    }
    query={{
      user: Tyr.local.user._id,
    }}
    paths={[
      'name',
      { path: 'collectionName', label: 'Type' },
      { path: 'startedAt', defaultSort: 'descend' },
      'endedAt',
    ]}
    export={false}
    actions={{
      download: {
        async on({ document }) {
          // await document.$project/populate({ file: 1 });
          const doc = (await TyrExport.byId(document.$id))!;
          const { file } = doc;
          if (file) {
            let downloadUrl = CF_PREFIX + file.key;
            // switch (file.type) {
            //   case 'text/csv':
            //     downloadUrl += '.csv';
            //     break;
            // }

            window.open(downloadUrl, '_blank');
          }
        },
      },
      close: {
        trait: 'cancel',
        align: 'right',
        on() {
          props.onClose?.();
        },
      },
    }}
  >
    <TyrRemove />
  </TyrTable>
);

registerComponent('TyrExports', TyrExports);
