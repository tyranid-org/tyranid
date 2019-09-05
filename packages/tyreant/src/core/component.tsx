import * as React from 'react';

import { Tyr } from 'tyranid/client';

import { WrappedFormUtils } from 'antd/lib/form/Form';

import { TyrTable, TableContext } from './table';
import { TyrAction } from './action';

export type TyrComponentProps = Readonly<{
  collection?: Tyr.CollectionInstance;
  fields?: { field: string }[];
}>;

export interface TyrComponentState {
  document?: Tyr.Document;
}

export class TyrComponent<
  State extends TyrComponentState = TyrComponentState
> extends React.Component<TyrComponentProps, State> {
  collection?: Tyr.CollectionInstance;
  form?: WrappedFormUtils;
  fields: Tyr.FieldInstance[] = [];
  parentTable?: TyrTable;

  connect(parentTable?: TyrTable) {
    let collection: Tyr.CollectionInstance | undefined;

    if (parentTable && !this.parentTable) {
      const { collection: propsCollection, fields: propsFields } = this.props;

      this.parentTable = parentTable;
      const parentCollection = parentTable.props.collection;
      collection = this.collection = propsCollection || parentCollection;

      const fields =
        propsFields ||
        (collection === parentCollection && parentTable.props.columns);

      if (fields) {
        this.fields = (fields as { field?: string }[])
          .filter(f => !!f.field)
          .map(f => collection!.paths[f.field!]);
      }
    }
  }

  async find(document: Tyr.Document) {
    const { collection } = this;

    if (!collection) throw new Error('no collection');

    if (collection.id !== document.$model.id) {
      throw new Error('mismatched collection ids');
    }

    const updatedDocument = await collection.byId(document.$id);
    if (!updatedDocument) {
      throw new Error('could not find document');
    }

    this.setState({ document: updatedDocument });
  }

  getFormRef = (ref: WrappedFormUtils | null) => {
    if (ref) this.form = ref;
  };

  wrap(children: () => React.ReactNode) {
    return (
      <TableContext.Consumer>
        {parentTable => {
          this.connect(parentTable);
          return children();
        }}
      </TableContext.Consumer>
    );
  }
}
