import { compact, debounce, uniq } from 'lodash';
import * as React from 'react';

import { Tyr } from 'tyranid/client';

import { Select, Spin, Button, Menu } from 'antd';
import { SelectProps, SelectValue } from 'antd/lib/select';
const { Option } = Select;

import {
  mapPropsToForm,
  onTypeChange,
  byName,
  TyrTypeProps,
  withTypeContext
} from './type';

import { TyrFieldLaxProps, decorateField } from '../core';

import Checkbox from 'antd/es/checkbox';
import { registerComponent } from '../common';

// TODO:  replace with antd's ModeOption when we upgrade ant
type ModeOption = 'default' | 'multiple' | 'tags';

export interface TyrLinkState {
  documents: Tyr.Document[];
  loading: boolean;
  initialLoading: boolean;
  viewLabel?: string;
}

const linkFieldFor = (path: Tyr.NamePathInstance) => {
  const field = path.detail;

  return field.type.name === 'array' && field.of!.type.name === 'link'
    ? field.of
    : field;
};

const linkFor = (path: Tyr.NamePathInstance) => linkFieldFor(path)?.link;

// TODO:  replace with collection.byLabel(label) once that is fixed to perform a case-insensitive search....
const findByLabel = (
  props: TyrTypeProps,
  collection: Tyr.CollectionInstance,
  label: string
) => {
  label = label.toLowerCase();
  const values =
    props && props.linkLabels ? props.linkLabels : collection.values;

  return values.find(lv => {
    const l = lv.$label;
    return l ? l.toLowerCase() === label : false;
  });
};

const findById = (
  props: TyrTypeProps,
  collection: Tyr.CollectionInstance,
  id: string
) => {
  const values =
    props && props.linkLabels ? props.linkLabels : collection.values;
  return values.find(lv => lv.$id === id);
};

const sortLabels = (labels: any[], props: TyrFieldLaxProps) => {
  if (!!props.manuallySortedLabels) {
    return labels.slice();
  }

  const searchSortById = !!props.searchSortById;
  const sortedLabels = labels.slice();

  sortedLabels.sort((a, b) => {
    if (searchSortById) {
      return a.$id - b.$id;
    }

    if (a.$label === b.$label) {
      return 0;
    }

    if (a.$label === undefined && b.$label !== undefined) {
      return -1;
    }

    if (b.$label === undefined && a.$label !== undefined) {
      return 1;
    }

    const aLabel = a.$label.toLowerCase ? a.$label.toLowerCase() : '';
    const bLabel = b.$label.toLowerCase ? b.$label.toLowerCase() : '';

    return aLabel.localeCompare(bLabel);
  });

  return sortedLabels;
};

export class TyrLinkBase extends React.Component<TyrTypeProps, TyrLinkState> {
  state: TyrLinkState = { documents: [], loading: false, initialLoading: true };

  protected lastFetchId = 0;

  private createOption = (val: Tyr.Document) => {
    const { $label, $id } = val;

    return (
      <Option key={this.mode === 'tags' ? $label : $id}>
        {this.props.searchOptionRenderer
          ? this.props.searchOptionRenderer(val)
          : $label}
      </Option>
    );
  };

  link?: Tyr.CollectionInstance;
  linkField?: Tyr.FieldInstance;
  mounted = false;
  mode: ModeOption = 'default';

  async componentDidMount() {
    const props = this.props;

    this.mounted = true;
    const { path, searchPath, mode: controlMode } = props;

    if (!path) throw new Error('TyrLink not passed a path!');

    if (searchPath) {
      const { detail: searchField } = searchPath;
      this.linkField =
        searchField.type.name === 'array' ? searchField.of : searchField;

      this.link = linkFor(searchPath);
    } else {
      const { detail: field } = path;
      this.linkField = field.type.name === 'array' ? field.of : field;
      this.link = linkFor(path);
    }

    if (!this.link) {
      if (props.linkLabels) {
        this.setState({
          initialLoading: false,
          documents: sortLabels(props.linkLabels, props)
        });
      } else {
        throw new Error('TyrLink passed a non-link');
      }
    } else {
      if (controlMode === 'view') {
        Tyr.mapAwait(
          path.tail.link!.idToLabel(path!.get(props.document)),
          label => this.setState({ viewLabel: label })
        );
      } else {
        if (this.link.isStatic()) {
          this.setState({
            initialLoading: false,
            documents: sortLabels(this.link.values, props)
          });
        } else {
          await this.search();
        }
      }
    }

    const { tail: field } = path!;

    let mode: any;
    // TODO:  'tags', 'combobox'
    if (field.type.name === 'array') {
      mode =
        field.of!.link &&
        field.of!.link!.def.tag &&
        this.props.mode !== 'search'
          ? 'tags'
          : 'multiple';

      // if mode is search, but you do not want multiple selection, then override
      if (this.props.multiple === false && this.props.mode === 'search') {
        mode = 'default';
      }
    } else {
      mode = 'default';
    }

    this.mode = mode;

    mapPropsToForm(props);
  }

  getValue() {
    const { path, document, value } = this.props;

    if (value) {
      return value.value;
    }

    return path!.get(document);
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  search = debounce(async (text?: string) => {
    const { document, getSearchIds } = this.props;
    const link = this.link!;

    if (this.mounted) {
      this.setState({ loading: true });
    }

    const fetchId = ++this.lastFetchId;

    const promises: Promise<Tyr.Document[]>[] = [
      this.linkField!.labels(document!, text)
    ];

    // include the current value
    const val = this.getValue();

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
        documents: sortLabels(documents, this.props),
        loading: false,
        initialLoading: false
      });
    }
  }, 200);

  render(): React.ReactNode {
    const { props } = this;
    const { mode: controlMode, path, onSelect, onDeselect } = props;
    const { documents, loading, initialLoading, viewLabel } = this.state;

    if (controlMode === 'view') {
      return decorateField('link', props, () => (
        <span className="tyr-value">{viewLabel}</span>
      ));
    }

    const selectProps: SelectProps = {
      mode: this.mode,
      labelInValue: !!props.labelInValue,
      notFoundContent: loading ? (
        <Spin size="small" style={{ position: 'static' }} />
      ) : null,
      showSearch: true,
      onSearch: this.search,
      placeholder: this.props.placeholder,
      onSelect,
      onDeselect,
      autoFocus: this.props.autoFocus,
      tabIndex: this.props.tabIndex,
      className: this.props.className,
      dropdownClassName: this.props.dropdownClassName,
      filterOption: false,
      loading: !!initialLoading
    };

    const onTypeChangeFunc = (ev: any) => {
      onTypeChange(props, ev, ev);
      this.props.onChange && this.props.onChange(ev, ev, props);
    };

    if (this.mode === 'tags') {
      selectProps.onChange = async value => {
        const values = value as string[];
        const link = this.link!;
        const { onStateChange } = this.props;

        if (link.def.tag) {
          await Promise.all(
            values.map(async value => {
              let label = (this.link as any).byIdIndex[value];

              if (!label) {
                label = findByLabel(props, this.link!, value);

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

        onTypeChangeFunc(value);
      };
    }

    if (onSelect) {
      selectProps.onSelect = (
        value: SelectValue,
        option: React.ReactElement<any>
      ) => {
        const v = findByLabel(props, this.link!, value as string);

        onSelect(
          v
            ? ({ key: v.$id, label: v.$label, document: v } as SelectValue)
            : value,
          option
        );
      };
    }

    return decorateField('link', props, () => (
      <Select
        {...selectProps}
        onChange={selectProps.onChange || onTypeChangeFunc}
      >
        {documents.map(this.createOption)}
      </Select>
    ));
  }
}

export const TyrLink = withTypeContext('link', TyrLinkBase);

byName.link = {
  component: TyrLinkBase,

  // Given ids, return the labels
  mapDocumentValueToFormValue(path, value, props) {
    if (Array.isArray(value)) {
      value = value.map(v => {
        const nv = findById(props!, linkFor(path)!, v);
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
      const nv = findById(props!, linkFor(path)!, value as string);

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
  mapFormValueToDocumentValue(path, value, props) {
    const nv = findByLabel(props!, linkFor(path)!, value);
    if (nv) value = nv.$id;
    return value && value.key ? value.key : value;
  },

  /**
   * Note that this filter handles both the "link" and the "array of link" cases
   */
  filter(path, filterable, props) {
    const pathName = path.name;
    const linkField = linkFieldFor(path)!;
    const link = linkField.link!;

    const { localSearch, localDocuments } = filterable;

    const onClearFilters = (
      clearFilters?: (selectedKeys: string[]) => void
    ) => {
      delete filterable.searchValues[pathName];
      clearFilters?.([]);
      filterable.onSearch();
    };

    let filterValues: { $id: any; $label: string }[] | undefined =
      props.filterValues;

    if (!filterValues) {
      if (localSearch && localDocuments && props.filterOptionLabel) {
        // Go get all the values for the filter

        const allLabels: {
          $id: any;
          $label: string;
        }[] = [];

        localDocuments.forEach(d => {
          const values = props.filterOptionLabel!(d);

          if (Array.isArray(values)) {
            allLabels.push(...values);
          } else if (values) {
            allLabels.push(values);
          }
        });

        filterValues = uniq(compact(allLabels), '$id');
      } else {
        if (!link.isStatic()) {
          linkField.labels(new path.tail.collection({})).then(results => {
            filterValues = results.map(d => ({
              ...d,
              $id: String(d.$id),
              $label: d.$label
            }));
          });
        } else {
          filterValues = linkFor(path)!.values.map(d => {
            return {
              ...d,
              $id: String(d.$id),
              $label: d.$label
            };
          });
        }
      }
    }

    return {
      filterDropdown: ({
        //selectedKeys,
        setSelectedKeys,
        clearFilters,
        confirm
      }) => {
        let values = filterable.searchValues[pathName];
        if (!Array.isArray(values)) values = values ? [values] : [];
        // we clone the searchvalues here so that modifying them does not trigger a findAll() in the table/etc. control from mobx
        values = Tyr.cloneDeep(values);

        const search = (onChange?: boolean) => {
          filterable.searchValues[pathName] = Tyr.cloneDeep(values);
          filterable.onSearch();
          if (!onChange) confirm?.();
        };

        return (
          <div className="search-box" style={{ padding: 0 }}>
            <Menu
              className="ant-table-filter-dropdown ant-dropdown-menu"
              style={{ maxHeight: '360px', overflowX: 'hidden', padding: 0 }}
              selectedKeys={values}
              mode="vertical"
              multiple={true}
              onClick={_.debounce(({ key }: { key: string }) => {
                // this debounce is here because if you clicked on the Menu (and not the contained Checkbox) it would fire this event twice
                const strKey = String(key);

                const keyIdx = values.indexOf(strKey);

                if (keyIdx > -1) {
                  values.splice(keyIdx, 1);
                } else {
                  values.push(strKey);
                }

                filterable.searchValues[pathName] = values;
                setSelectedKeys?.(values);
                if (props.liveSearch) search(true);
              })}
            >
              {sortLabels(filterValues || link.values, props).map(v => {
                const isChecked = values.indexOf(v.$id) > -1;

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
                    <Checkbox checked={isChecked}>
                      {props.filterOptionRenderer
                        ? props.filterOptionRenderer(v)
                        : v.$label}
                    </Checkbox>
                  </Menu.Item>
                );
              })}
            </Menu>
            <div className="search-box-footer" style={{ padding: '8px' }}>
              <Button
                onClick={() => onClearFilters(clearFilters)}
                size="small"
                style={{ width: 90 }}
              >
                Reset
              </Button>
              {!props.liveSearch && (
                <Button
                  type="primary"
                  onClick={() => search()}
                  icon="search"
                  size="small"
                  style={{ width: 90 }}
                >
                  Search
                </Button>
              )}
            </div>
          </div>
        );
      },
      onFilter: (value, doc) => {
        if (props.onFilter) return props.onFilter(value, doc);

        const rawVal = path.get(doc);

        if (Array.isArray(rawVal) && Array.isArray(value)) {
          for (let i = 0; i < value.length; i++) {
            const v = value[i];

            for (let j = 0; j < rawVal.length; j++) {
              if (v === rawVal[j]) return true;
            }
          }
        }

        const val = String(rawVal);

        if (Array.isArray(value)) {
          if (!value.length) return true;

          if (Array.isArray(val)) {
            for (const v of val) if (value.indexOf(v) > -1) return true;

            return false;
          }

          return value.indexOf(val) > -1;
        }

        if (Array.isArray(val)) return val.indexOf(value) > -1;

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
  },

  finder(path, opts, searchValue) {
    const link = linkFor(path)!;

    if (searchValue) {
      if (!opts.query) opts.query = {};
      opts.query[path.spath] = Array.isArray(searchValue)
        ? {
            $in: searchValue
          }
        : searchValue;
    }

    if (link.labelField && !link.isStatic()) {
      if (!opts.populate) opts.populate = {};
      opts.populate[path.spath] = link.labelProjection();
    }
  },

  cellValue: (path, document, props) => {
    const link = linkFor(path);
    let { detail: field } = path;

    if (link && link.labelField && !link.isStatic()) {
      path = path.walk(link.labelField.name);
      field = path.detail;
    }

    return field.type
      ? field.type.format(field, path.get(document))
      : 'Unknown Link';
  }
};

registerComponent('TyrLink', TyrLink);
