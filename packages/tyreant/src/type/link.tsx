import { compact, debounce } from 'lodash';

import * as React from 'react';

import { Tyr } from 'tyranid/client';

import { Select, Spin } from 'antd';
import { SelectProps } from 'antd/lib/select';
const { Option } = Select;

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

function linkFor(field: Tyr.FieldInstance) {
  if (field.type.name === 'array' && field.of!.type.name === 'link') {
    return field.of!.link;
  } else if (field.link) {
    return field.link;
  }

  //return undefined;
}

export class TyrLinkBase extends React.Component<TyrTypeProps, TyrLinkState> {
  state: TyrLinkState = { documents: [], loading: false };

  protected lastFetchId = 0;

  private createOption = (val: Tyr.Document) => {
    const { $id, $label } = val;

    return (
      <Option
        key={$id}
        value={$id}
        disabled={false /*val.disabled*/}
        title={$label}
      >
        {$label}
      </Option>
    );
  };

  link?: Tyr.CollectionInstance;
  linkField?: Tyr.FieldInstance;

  async componentDidMount() {
    const { field } = this.props;

    const link = linkFor(field);

    if (!link) throw new Error('TyrLink passed a non-link');

    this.link = link;
    this.linkField = field.type.name === 'array' ? field.of : field;

    if (link!.isStatic()) {
      this.setState({ documents: link!.values });
    } else {
      await this.search();
    }
  }

  search = debounce(async (text?: string) => {
    const { field, document } = this.props;
    const link = this.link!;

    this.setState({ loading: true });
    const fetchId = ++this.lastFetchId;

    const promises: Promise<Tyr.Document[]>[] = [];

    promises.push(this.linkField!.labels(document!, text));

    // include the current value
    const val = field.namePath.get(document);
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
        if (!existing) documents.push(addDocument);
      }
    }

    this.setState({
      documents,
      loading: false
    });
  }, 200);

  render() {
    const { field, form } = this.props;
    const { documents, loading } = this.state;
    const { getFieldDecorator } = form!;

    const rules = generateRules(field);

    let mode: typeof selectProps.mode;
    // TODO:  'tags', 'combobox'
    if (field.type.name === 'array') {
      mode = field.of!.link!.def.tag ? 'tags' : 'multiple';
    } else {
      mode = 'default';
    }

    const selectProps: SelectProps = {
      mode,
      filterOption: false,
      labelInValue: false,
      notFoundContent: loading ? <Spin size="small" /> : null,
      showSearch: true,
      onSearch: this.search
    };

    if (mode === 'tags') {
      selectProps.onChange = async value => {
        const values = value as string[];
        const link = this.link!;
        const { form } = this.props;
        if (link.def.tag) {
          const newValues = await Promise.all(
            values.map(async value => {
              let label = (this.link as Tyr.anny).byIdIndex[value];

              if (!label) {
                console.log('saving', {
                  [link.labelField.path]: value
                });
                label = await link.save({
                  [link.labelField.path]: value
                });
                console.log('newTag', label);
                label.$cache();
              }
              console.log({ value, label });

              return label;
            })
          );

          console.log('newValues', newValues);
          const selectValues = newValues.filter(v => v.$id).map(v => v.$id); //({
          //key: v.$id,
          //label: v.$label,
          //}));
          console.log('selectValues', selectValues);
          form!.setFieldsValue({
            [field.path]: selectValues
          });
        }
      };
    }

    return getFieldDecorator(field.path, { rules })(
      <Select className={className('tyr-link', this.props)} {...selectProps}>
        {compact(documents.map(this.createOption))}
      </Select>
    );
  }
}

export const TyrLink = withTypeContext(TyrLinkBase);

byName.link = {
  component: TyrLinkBase,
  mapDocumentValueToFormValue(field: Tyr.FieldInstance, value: Tyr.anny) {
    return value;
  },
  mapFormValueToDocumentValue(field: Tyr.FieldInstance, value: Tyr.anny) {
    return value && value.key ? value.key : value;
  },
  filter: (field: Tyr.FieldInstance, filterable: Filterable) => ({
    filters: linkFor(field)!.values.map((v: Tyr.anny) => ({
      text: v.$label,
      value: v._id
    }))
  }),
  finder(
    field: Tyr.FieldInstance,
    opts: Tyr.anny /* Tyr.Options_Find */,
    searchValue: Tyr.anny
  ) {
    if (searchValue) {
      if (!opts.query) opts.query = {};
      opts.query[field.path] = {
        $in: String(searchValue)
          .split('.')
          .map(v => parseInt(v, 10))
      };
    }

    const link = linkFor(field)!;
    if (link.labelField && !link.isStatic()) {
      if (!opts.populate) opts.populate = {};
      opts.populate[field.path] = {
        [link.labelField.path]: 1
      };
    }
  },
  cellValue: (field: Tyr.FieldInstance, document: Tyr.Document) => {
    const link = linkFor(field);
    if (link && link.labelField && !link.isStatic()) {
      const populatedName = (Tyr as Tyr.anny).NamePath.populateNameFor(
        field.name
      );
      const populatedObject = (document as Tyr.anny)[populatedName];

      return populatedObject ? populatedObject[link.labelField.name] : '';
    } else {
      return field.type.format(field, field.namePath.get(document));
    }
  }
};
