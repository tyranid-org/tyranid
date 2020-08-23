import * as React from 'react';

//import { DownloadOutlined } from '@ant-design/icons';

import { Tyr } from 'tyranid/client';
import { TyrTable, TyrModal } from '../core';
import { registerComponent } from '../common';

const { TyrExport } = Tyr.collections;

interface Props {
  onClose?: () => void;
}

export const TyrExports = (props: Props) => (
  <TyrTable
    collection={TyrExport}
    decorator={<TyrModal defaultOpen={true} title="Exports" />}
    paths={['name', 'startedAt', 'endedAt']}
    export={false}
    actions={{
      download: {
        href: ({ document }) => document.file,
        target: '_blank',
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
