import * as React from 'react';

//import { DownloadOutlined } from '@ant-design/icons';

import { Tyr } from 'tyranid/client';
import { TyrTable, TyrModal } from '../core';
import { registerComponent } from '../common';

const { TyrExport } = Tyr.collections;

interface Props {
  onClose?: () => void;
}

const CF_PREFIX = (Tyr.options as any).aws?.cloudfrontPrefix || '';

export const TyrExports = (props: Props) => (
  <TyrTable
    collection={TyrExport}
    decorator={
      <TyrModal defaultOpen={true} className="tyr-wide-modal" title="Exports" />
    }
    paths={['name', 'startedAt', 'endedAt']}
    export={false}
    actions={{
      download: {
        async on({ document }) {
          //await document.$project/populate({ file: 1 });
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
  />
);

registerComponent('TyrExports', TyrExports);
