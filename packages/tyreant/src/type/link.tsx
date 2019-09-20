import { compact, debounce, uniq } from 'lodash';
import * as React from 'react';

import { Tyr } from 'tyranid/client';

import { Select, Spin, Button, Menu } from 'antd';
import { SelectProps, SelectedValue } from 'antd/lib/select';
const { Option } = Select;

import { FilterDropdownProps } from 'antd/es/table';

import {
  mapPropsToForm,
  onTypeChange,
  Filter,
  byName,
  Filterable,
  TyrTypeProps,
  withTypeContext
} from './type';

import { TyrFieldLaxProps, decorateField } from '../core';

import Checkbox from 'antd/es/checkbox';

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

type Label = { $id: any; $label: string };

const sortLabels = (labels: any[], searchSortById?: boolean) => {
  (labels as Label[]).sort((a, b) => {
    if (searchSortById) {
      return a.$id - b.$id;
    }

    const aLabel = a.$label.toLowerCase();
    const bLabel = b.$label.toLowerCase();
    if (aLabel < bLabel) {
      return -1;
    }
    if (aLabel > bLabel) {
      return 1;
    }
    return 0;
  });

  return labels;
};

export class TyrLinkBase extends React.Component<TyrTypeProps, TyrLinkState> {
  state: TyrLinkState = { documents: [], loading: false };

  protected lastFetchId = 0;

  private createOption = (val: Tyr.Document) => {
    const { $label, $id } = val;

    return (
      <Option key={$id}>
        {this.props.searchOptionRenderer
          ? this.props.searchOptionRenderer(val)
          : $label}
      </Option>
    );
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
        documents: sortLabels(link!.values, props.searchSortById)
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
    }

    return path.get(document);
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
      const fields = link.labelProjection();

      promises.push(
        // switch to simple Array.isArray() once we move to mobx 5
        link.byIds(typeof val === 'string' ? [val] : val, {
          fields
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
          if (this.props.searchSortById) {
            return (a as any).$id - (b as any).$id;
          }

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
    const { mode: controlMode, path, multiple, onSelect, onDeselect } = props;
    const { documents, loading } = this.state;

    if (controlMode === 'view') {
      return (
        <label>{path.tail.link!.idToLabel(path.get(props.document))}</label>
      );
    }

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
      onDeselect,
      autoFocus: this.props.autoFocus
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

    if (onSelect) {
      selectProps.onSelect = (
        value: SelectedValue,
        option: React.ReactElement<any>
      ) => {
        const v = findByLabel(this.link!, value as string);

        onSelect(
          v
            ? ({ key: v.$id, label: v.$label, document: v } as SelectedValue)
            : value,
          option
        );
      };
    }

    return decorateField('link', props, () => (
      <Select {...selectProps} onChange={(ev: any) => onTypeChange(props, ev)}>
        {compact(documents.map(this.createOption))}
      </Select>
    ));
  }
}

export const TyrLink = withTypeContext(TyrLinkBase);

export const linkFilter: Filter = (
  path: Tyr.NamePathInstance,
  filterable: Filterable,
  props: TyrFieldLaxProps
) => {
  const pathName = path.name;
  const { localSearch, localDocuments } = filterable;

  const onClearFilters = (clearFilters?: (selectedKeys: string[]) => void) => {
    delete filterable.searchValues[pathName];

    clearFilters && clearFilters([]);

    if (localSearch) {
      filterable.onFilterChange();
    } else {
      filterable.onSearch();
    }
  };

  let filterValues: { $id: any; $label: string }[] | undefined;

  if (localSearch && localDocuments && props.filterOptionLabel) {
    // Go get all the values for the filter
    filterValues = uniq(
      compact(localDocuments.map((d: any) => props.filterOptionLabel!(d))),
      '$id'
    );
  } else {
    const link = linkFor(path)!;

    if (!link.isStatic()) {
      path.tail.labels(new path.tail.collection({})).then(results => {
        filterValues = results.map(d => {
          return {
            ...d,
            $id: String(d.$id)
          };
        });
      });
    } else {
      filterValues = linkFor(path)!.values.map(d => {
        return {
          ...d,
          $id: String(d.$id)
        };
      });
    }
  }

  return {
    filterDropdown: (filterDdProps: FilterDropdownProps) => (
      <div className="search-box" style={{ padding: 0 }}>
        <Menu
          className="ant-table-filter-dropdown ant-dropdown-menu"
          style={{ maxHeight: '400px', overflowX: 'hidden', padding: 0 }}
          selectedKeys={filterable.searchValues[pathName]}
          mode="vertical"
          multiple={true}
          onClick={({ key }) => {
            const strKey = String(key);

            if (!filterable.searchValues[pathName]) {
              filterable.searchValues[pathName] = [];
            }

            const values = filterable.searchValues[pathName];
            const keyIdx = values.indexOf(strKey);

            if (keyIdx > -1) {
              filterable.searchValues[pathName].splice(keyIdx, 1);
            } else {
              values.push(strKey);
            }

            if (props.liveSearch) {
              filterable.onFilterChange();
            }
          }}
        >
          {sortLabels(
            filterValues || linkFor(path)!.values,
            props.searchSortById
          ).map((v: any) => {
            const values = filterable.searchValues[pathName];
            const isChecked = values && values.indexOf(v.$id) > -1;

            return (
              <Menu.Item
                key={v.$id}
                className="ant-dropdown-menu-item"
                style={{
                  marginBottom: 0,
                  marginTop: 0,
                  lineHeight: '30px',
                  height: '30px'
                }}
              >
                <Checkbox checked={isChecked} />
                {props.filterOptionRenderer
                  ? props.filterOptionRenderer(v)
                  : v.$label}
              </Menu.Item>
            );
          })}
        </Menu>
        <div className="search-box-footer" style={{ padding: '8px' }}>
          <Button
            onClick={() => onClearFilters(filterDdProps.clearFilters)}
            size="small"
            style={{ width: 90 }}
          >
            Reset
          </Button>
          {!props.liveSearch && (
            <Button
              type="primary"
              onClick={() => {
                if (localSearch) {
                  filterable.onFilterChange();
                } else {
                  filterable.onSearch();
                }

                filterDdProps.confirm && filterDdProps.confirm();
              }}
              icon="search"
              size="small"
              style={{ width: 90 }}
            >
              Search
            </Button>
          )}
        </div>
      </div>
    ),
    onFilter: (value: any, doc: Tyr.Document) => {
      const val = String(path.get(doc));

      if (Array.isArray(value)) {
        return (value as any[]).indexOf(val) > -1;
      }

      return val === value;
    }
    /*
    onFilterDropdownVisibleChange: (visible: boolean) => {
      if (visible) {
        setTimeout(() => searchInputRef!.focus());
      }
    }
    */
  };
};

byName.link = {
  component: TyrLinkBase,

  // Given ids, return the labels
  mapDocumentValueToFormValue(path: Tyr.NamePathInstance, value: any) {
    if (Array.isArray(value)) {
      value = value.map(v => {
        const nv = findById(linkFor(path)!, v);
        if (nv) {
          const column = (path.tail as any).column;
          if (column && column.translateForWhiteLabel) {
            return column.translateForWhiteLabel(nv.$label);
          }

          return nv.$label;
        }

        return v;
      });
    } else {
      const nv = findById(linkFor(path)!, value as string);

      if (nv) {
        const column = (path.tail as any).column;
        if (column && column.translateForWhiteLabel) {
          value = column.translateForWhiteLabel(nv.$label);
        } else {
          value = nv.$label;
        }
      }
    }

    // if collection has label renderer, then return value with labelProjection
    return value && value.label ? value.label : value;
  },
  // Given labels, return the ids
  mapFormValueToDocumentValue(path: Tyr.NamePathInstance, value: any) {
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
  filter: linkFilter,
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

      opts.populate[path.name] = link.labelProjection();
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
