import * as React from 'react';

import { debounce } from 'lodash';

import { SelectProps } from 'antd/lib/select';

import { Tyr } from 'tyranid/client';

import { mapPropsToForm, onTypeChange, TyrTypeProps } from './type';
import {
  TyrPathProps,
  TyrLabelRenderer,
  decorateField,
  getValue,
  getLabelRenderer,
} from '../core';

type ModeOption = SelectProps<any>['mode'];

export const linkFieldFor = (path: Tyr.PathInstance) => {
  const field = path.detail;

  return field.type.name === 'array' && field.of!.type.name === 'link'
    ? field.of
    : field;
};

export const linkFor = (path: Tyr.PathInstance) => {
  const linkField = linkFieldFor(path);

  return (
    linkField &&
    (linkField.name === '_id' ? linkField.collection : linkField.link)
  );
};

export const findByLabel = (
  props: TyrTypeProps<any>,
  collection: Tyr.CollectionInstance,
  label: string
) => {
  label = label.toLowerCase?.() || label;
  return (props?.linkLabels || collection.values).find(
    lv => lv.$label?.toLowerCase() === label
  );
};

export const findById = (
  props: TyrTypeProps<any>,
  collection: Tyr.CollectionInstance,
  id: string
) => (props?.linkLabels || collection.values).find(lv => lv.$id === id);

export const sortLabels = (labels: any[], props: TyrPathProps<any>) => {
  if (!!props.manuallySortedLabels) {
    return labels.slice();
  }

  const searchSortById = !!props.searchSortById;
  const sortedLabels = labels.slice();

  sortedLabels.sort((a, b) => {
    if (searchSortById) return a.$id - b.$id;
    if (a.$label === b.$label) return 0;
    if (a.$label === undefined && b.$label !== undefined) return -1;
    if (b.$label === undefined && a.$label !== undefined) return 1;

    const aLabel = a.$label.toLowerCase?.() ?? '';
    const bLabel = b.$label.toLowerCase?.() ?? '';
    return aLabel.localeCompare(bLabel);
  });

  return sortedLabels;
};

export interface TyrLinkState {
  documents: Tyr.Document[];
  loading: boolean;
  initialLoading: boolean;
  viewLabel?: string;
}

export class TyrLinkAbstract<
  D extends Tyr.Document = Tyr.Document
> extends React.Component<TyrTypeProps<D>, TyrLinkState> {
  state: TyrLinkState = { documents: [], loading: false, initialLoading: true };

  protected lastFetchId = 0;

  link?: Tyr.CollectionInstance;
  linkField?: Tyr.FieldInstance;
  mounted = false;
  mode: ModeOption | undefined = undefined;

  private initLink(path: Tyr.PathInstance) {
    const { detail: field } = path;
    this.linkField = field.type.name === 'array' ? field.of : field;
    this.link = linkFor(path);
  }

  async componentDidMount() {
    const props = this.props;
    let searched = false;

    this.mounted = true;
    const { path, searchPath, mode: controlMode } = props;

    if (!path) throw new Error('TyrLink not passed a path!');

    this.initLink(searchPath || path);

    if (!this.link) {
      if (props.linkLabels) {
        this.setState({
          documents: sortLabels(props.linkLabels, props),
        });
      } else {
        throw new Error('TyrLink passed a non-link');
      }
    } else {
      if (controlMode === 'view') {
        Tyr.mapAwait(
          path.detail.link!.idToLabel(path!.get(props.document)),
          label => this.setState({ viewLabel: label })
        );
      } else {
        if (this.link.isStatic()) {
          this.setState({
            documents: sortLabels(this.link.values, props),
          });
        } else {
          await this.search();
          searched = true;
        }
      }
    }

    const { tail: field } = path!;

    let mode: ModeOption;
    // TODO:  'tags', 'combobox'
    if (field.type.name === 'array') {
      mode =
        field.of!.link?.def.tag && this.props.mode !== 'search'
          ? 'tags'
          : 'multiple';

      // if mode is search, but you do not want multiple selection, then override
      if (this.props.multiple === false && this.props.mode === 'search') {
        mode = undefined;
      }
    } else {
      mode = undefined;
    }

    this.mode = mode;

    if (searched)
      setTimeout(() => {
        mapPropsToForm(props);
        this.setState({ initialLoading: false });
      }, 0);
    else {
      mapPropsToForm(props);
      this.setState({ initialLoading: false });
    }
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  // TODO:  @memo
  _labelRenderer?: TyrLabelRenderer;
  get renderLabel(): TyrLabelRenderer {
    return (
      this._labelRenderer ||
      (this._labelRenderer = getLabelRenderer(this.props))
    );
  }

  search = debounce(
    async (text?: string) => {
      const { props } = this;
      const { component, path, document, getSearchIds } = props;
      const link = this.link!;

      if (this.mounted) this.setState({ loading: true });

      const fetchId = ++this.lastFetchId;

      let opts;
      let query;
      if (path?.detail.isId() && (query = component?.props.query))
        opts = { query };

      const promises: Promise<Tyr.Document[]>[] = [
        this.linkField!.labels(document!, text, opts),
      ];

      // include the current value
      const val = getValue(props);

      if (val) {
        const fields = link.labelProjection();

        // switch to simple Array.isArray() once we move to mobx 5
        const ids =
          typeof val === 'string'
            ? [val]
            : getSearchIds
            ? getSearchIds(val)
            : val;

        promises.push(link.byIds(ids, { fields }));
      }

      const [documents, addDocuments] = await Promise.all(promises);
      if (fetchId !== this.lastFetchId) return;

      if (addDocuments) {
        for (const addDocument of addDocuments) {
          const existing = documents.find(doc => addDocument.$id === doc.$id);
          if (!existing) {
            documents.push(addDocument);
          }
        }
      }

      if (this.mounted) {
        this.setState({
          documents: sortLabels(documents, this.props),
          loading: false,
        });
      }
    },
    200,
    { leading: true } // debounce'd async functions need leading: true
  );

  onTypeChangeFunc = (ev: any) => {
    const { props } = this;
    onTypeChange(props, ev, ev);
    this.props.onChange?.(ev, ev, props);
  };

  render() {
    const { props } = this;
    const { mode: controlMode } = props;
    const { viewLabel, initialLoading } = this.state;

    if (controlMode === 'view') {
      return decorateField('link', props, () => (
        <span className="tyr-value">{viewLabel}</span>
      ));
    }

    if (initialLoading) return <></>;
  }
}
