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
> extends TyrComponent<D, Props, State> {
  async query() {
    if (!this.visible || this.loading) return;

    await this.load();
  }

  async requery() {
    await this.query();
  }

  async load() {
    try {
      this.loading++;

      if (this.mounted) {
        await this.find();
      }
    } finally {
      this.loading--;
    }
  }

  async find() {
    const { collection, document, linkToParent, linkFromParent } = this;
    let updatedDocument: D | null | undefined;

    if (!collection) throw new Tyr.AppError('no collection');

    if (linkToParent) {
      this.findOpts = {
        query: {
          [linkToParent.path.spath]: document.$id,
        },
      };

      this.trace('find', 'findOne', this.findOpts);
      updatedDocument = (await collection.findOne(this.findOpts)) as D;
    } else if (linkFromParent) {
      const id = linkFromParent.path.get(document);

      this.trace('find', 'by parent Id', id);
      updatedDocument = (await collection.byId(id)) as D;
    } else {
      if (collection.id !== document.$model.id) {
        throw new Tyr.AppError('mismatched collection ids');
      }

      this.trace('find', 'byId', document.$id);
      updatedDocument = (await collection.byId(document.$id)) as D;
      if (!updatedDocument) {
        throw new Tyr.AppError('could not find document');
      }
    }

    if (updatedDocument) {
      this.document = updatedDocument;
      this.refresh();
    }
  }
}
