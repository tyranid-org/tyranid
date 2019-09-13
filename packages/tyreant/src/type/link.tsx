import { compact, debounce } from 'lodash';
import * as React from 'react';

import { Tyr } from 'tyranid/client';

import { Select, Spin } from 'antd';
import { SelectProps } from 'antd/lib/select';
const { Option } = Select;

import { mapDocumentToForm, mapPropsToForm } from './type';

import {
  byName,
  generateRules,
  Filterable,
  TyrTypeProps,
  className,
  withTypeContext
} from './type';

export interface TyrLinkState {
  documents: Tyr.Document[];
  loading: boolean;
}

const linkFor = (path: Tyr.NamePathInstance) => {
  const { detail: field } = path;

  if (field.type.name === 'array' && field.of!.type.name === 'link') {
    return field.of!.link;
  } else if (field.link) {
    return field.link;
  }
};

// TODO:  replace with collection.byLabel(label) once that is fixed to perform a case-insensitive search...
const findByLabel = (collection: Tyr.CollectionInstance, label: string) => {
  label = label.toLowerCase();

  return collection.values.find(lv => {
    const l = lv.$label;
    return l ? l.toLowerCase() === label : false;
  });
};

const findById = (collection: Tyr.CollectionInstance, id: string) =>
  collection.values.find(lv => lv.$id === id);

export class TyrLinkBase extends React.Component<TyrTypeProps, TyrLinkState> {
  state: TyrLinkState = { documents: [], loading: false };

  protected lastFetchId = 0;

  private createOption = (val: Tyr.Document) => {
    const { $label } = val;

    return <Option key={$label}>{$label}</Option>;
  };

  link?: Tyr.CollectionInstance;
  linkField?: Tyr.FieldInstance;
  mounted = false;

  async componentDidMount() {
    const props = this.props;

    this.mounted = true;
    const { path } = props;
    const { detail: field } = path;

    const link = linkFor(path);

    if (!link) throw new Error('TyrLink passed a non-link');

    this.link = link;
    this.linkField = field.type.name === 'array' ? field.of : field;

    if (link!.isStatic()) {
      this.setState({
        documents: link!.values.sort((a: any, b: any) => {
          const aLabel = a.$label.toLowerCase();
          const bLabel = b.$label.toLowerCase();
          if (aLabel < bLabel) {
            return -1;
          }
          if (aLabel > bLabel) {
            return 1;
          }
          return 0;
        })
      });
    } else {
      await this.search();
    }

    mapPropsToForm(props);
  }

  getValue() {
    const { path, document, value } = this.props;

    if (value) {
      return value.value;
    } else {
      return path.get(document);
    }
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  search = debounce(async (text?: string) => {
    const { document } = this.props;
    const link = this.link!;

    if (this.mounted) {
      this.setState({ loading: true });
    }

    const fetchId = ++this.lastFetchId;

    const promises: Promise<Tyr.Document[]>[] = [];

    promises.push(this.linkField!.labels(document!, text));

    // include the current value
    const val = this.getValue();
    if (val) {
      promises.push(
        // switch to simple Array.isArray() once we move to mobx 5
        link.byIds(typeof val === 'string' ? [val] : val, {
          fields: { _id: 1, [link.labelField.name]: 1 }
        })
      );
    }

    const [documents, addDocuments] = await Promise.all(promises);
    if (fetchId !== this.lastFetchId) {
      return;
    }

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
        documents: documents.sort((a, b) => {
          const aLabel = a.$label.toLowerCase();
          const bLabel = b.$label.toLowerCase();
          if (aLabel < bLabel) {
            return -1;
          }
          if (aLabel > bLabel) {
            return 1;
          }
          return 0;
        }),
        loading: false
      });
    }
  }, 200);

  render(): React.ReactNode {
    const { props } = this;
    const { path, form, multiple, onSelect, onDeselect } = props;
    const { documents, loading } = this.state;
    const { getFieldDecorator } = form!;

    const rules = generateRules(props);

    const { detail: field } = path;

    let mode: typeof selectProps.mode;
    // TODO:  'tags', 'combobox'
    if (field.type.name === 'array') {
      mode =
        field.of!.link!.def.tag && this.props.mode !== 'search'
          ? 'tags'
          : 'multiple';

      // if mode is search, but you do not want multiple selection, then override
      if (multiple === false && this.props.mode === 'search') {
        mode = 'default';
      }
    } else {
      mode = 'default';
    }

    const selectProps: SelectProps = {
      mode,
      labelInValue: false,
      notFoundContent: loading ? <Spin size="small" /> : null,
      showSearch: true,
      onSearch: this.search,
      placeholder: this.props.placeholder,
      onSelect,
      onDeselect
    };

    if (mode === 'tags') {
      selectProps.onChange = async value => {
        const values = value as string[];
        const link = this.link!;
        const { onStateChange } = this.props;

        if (link.def.tag) {
          await Promise.all(
            values.map(async value => {
              let label = (this.link as any).byIdIndex[value];

              if (!label) {
                label = findByLabel(this.link!, value);

                if (!label) {
                  onStateChange && onStateChange({ ready: false });

                  label = await link.save({
                    [link.labelField.path]: value
                  });

                  label.$cache();
                  onStateChange && onStateChange({ ready: true });
                }
              }
            })
          );
        }
      };
    }

    return getFieldDecorator(path.name, { rules })(
      <Select className={className('tyr-link', this.props)} {...selectProps}>
        {compact(documents.map(this.createOption))}
      </Select>
    );
  }
}

export const TyrLink = withTypeContext(TyrLinkBase);

byName.link = {
  component: TyrLinkBase,

  // Given ids, return the labels
  mapDocumentValueToFormValue(path: Tyr.NamePathInstance, value: any) {
    if (Array.isArray(value)) {
      value = value.map(v => {
        const nv = findById(linkFor(path)!, v);
        return nv ? nv.$label : v;
      });
    } else {
      const nv = findById(linkFor(path)!, value as string);
      if (nv) value = nv.$label;
    }

    return value && value.label ? value.label : value;
  },
  // Given labels, return the ids
  mapFormValueToDocumentValue(path: Tyr.NamePathInstance, value: any) {
    const { detail: field } = path;

    if (Array.isArray(value)) {
      value = value.map(v => {
        const nv = findByLabel(linkFor(path)!, v);
        return nv ? nv.$id : v;
      });
    } else {
      const nv = findByLabel(linkFor(path)!, value);
      if (nv) value = nv.$id;
    }

    return value && value.key ? value.key : value;
  },
  filter: (path: Tyr.NamePathInstance, filterable: Filterable) => ({
    filters: linkFor(path)!.values.map((v: any) => ({
      text: v.$label,
      value: v._id
    }))
  }),
  finder(
    path: Tyr.NamePathInstance,
    opts: any /* Tyr.Options_Find */,
    searchValue: any
  ) {
    if (searchValue) {
      if (!opts.query) opts.query = {};
      opts.query[path.name] = {
        $in: String(searchValue)
          .split('.')
          .map(v => parseInt(v, 10))
      };
    }

    const link = linkFor(path)!;
    if (link.labelField && !link.isStatic()) {
      if (!opts.populate) opts.populate = {};
      opts.populate[path.name] = {
        [link.labelField.path]: 1
      };
    }
  },
  cellValue: (path: Tyr.NamePathInstance, document: Tyr.Document) => {
    const link = linkFor(path);
    const { detail: field } = path;

    if (link && link.labelField && !link.isStatic()) {
      const populatedName = (Tyr as any).NamePath.populateNameFor(field.name);
      const populatedObject = (document as any)[populatedName];

      return populatedObject ? populatedObject[link.labelField.name] : '';
    } else {
      return field.type.format(field, path.get(document));
    }
  }
};
