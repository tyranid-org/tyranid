import { observer } from 'mobx-react';

import { Tyr } from 'tyranid/client';

import {
  TyrComponentProps,
  TyrComponentState,
  TyrComponent,
} from './component';

export interface TyrOneComponentProps<D extends Tyr.Document = Tyr.Document>
  extends TyrComponentProps<D> {}

export interface TyrOneComponentState<D extends Tyr.Document = Tyr.Document>
  extends TyrComponentState<D> {}

/**
 * A TyrOneComponent represents a react component that contain one document, i.e. TyrForm
 */
@observer
export class TyrOneComponent<
  D extends Tyr.Document = Tyr.Document,
  Props extends TyrOneComponentProps<D> = TyrOneComponentProps<D>,
  State extends TyrOneComponentState<D> = TyrOneComponentState<D>
> extends TyrComponent<D, Props, State> {}
