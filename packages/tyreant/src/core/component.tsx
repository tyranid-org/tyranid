import * as React from 'react';

import { Tyr } from 'tyranid/client';

import { WrappedFormUtils } from 'antd/lib/form/Form';

import { TableContext } from './table';
import { TyrAction } from './action';

export interface TyrComponentProps {
  collection?: Tyr.CollectionInstance;
  fields?: { field?: string }[];
}

export interface TyrComponentState {
  document?: Tyr.Document;
  documents?: Tyr.Document[];
}

export class TyrComponent<
  Props extends TyrComponentProps = TyrComponentProps,
  State extends TyrComponentState = TyrComponentState
> extends React.Component<Props, State> {
  collection?: Tyr.CollectionInstance;
  form?: WrappedFormUtils;
  fields: Tyr.FieldInstance[] = [];
  parent?: TyrComponent;

  actions: TyrAction[] = [];
  enact(action: TyrAction) {
    this.actions.push(action);
  }

  connect(parent?: TyrComponent) {
    let collection: Tyr.CollectionInstance | undefined;

    if (parent && !this.parent) {
      const { collection: propsCollection, fields: propsFields } = this.props;

      this.parent = parent;
      const parentCollection = parent.props.collection;
      collection = this.collection = propsCollection || parentCollection;

      const fields =
        propsFields || (collection === parentCollection && parent.props.fields);

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
        {parent => {
          this.connect(parent);
          return children();
        }}
      </TableContext.Consumer>
    );
  }
}
