import { compact, debounce, uniq } from 'lodash';
import * as React from 'react';
import { useState } from 'react';

import { Select, Spin, Menu, Input, Checkbox } from 'antd';
import { SelectProps, SelectValue } from 'antd/lib/select';
const { Option } = Select;
const { Search } = Input;

import { Tyr } from 'tyranid/client';

import { mapPropsToForm, onTypeChange, byName, TyrTypeProps } from './type';
import { withThemedTypeContext } from '../core/theme';
import { TyrPathProps, decorateField } from '../core';
import { TyrFilter, FilterDdProps, Filterable } from '../core/filter';
import { registerComponent } from '../common';

type ModeOption = SelectProps<any>['mode'];

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
  label = typeof label === 'string' ? label.toLowerCase() : label;
  const values =
    props && props.linkLabels ? props.linkLabels : collection.values;

  return values.find((lv) => {
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
  return values.find((lv) => lv.$id === id);
};

const sortLabels = (labels: any[], props: TyrPathProps) => {
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

export class TyrLinkBase extends React.Component<TyrTypeProps, TyrLinkState> {
  state: TyrLinkState = { documents: [], loading: false, initialLoading: true };

  protected lastFetchId = 0;

  private createOption = (val: Tyr.Document) => {
    const { $label, $id } = val;

    const key = this.mode === 'tags' ? $label : $id;

    return (
      <Option key={key} value={key}>
        {this.props.searchOptionRenderer
          ? this.props.searchOptionRenderer(val)
          : $label}
      </Option>
    );
  };

  link?: Tyr.CollectionInstance;
  linkField?: Tyr.FieldInstance;
  mounted = false;
  mode: ModeOption | undefined = undefined;

  async componentDidMount() {
    const props = this.props;
    let searched = false;

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
          documents: sortLabels(props.linkLabels, props),
        });
      } else {
        throw new Error('TyrLink passed a non-link');
      }
    } else {
      if (controlMode === 'view') {
        Tyr.mapAwait(
          path.tail.link!.idToLabel(path!.get(props.document)),
          (label) => this.setState({ viewLabel: label })
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
        field.of!.link &&
        field.of!.link!.def.tag &&
        this.props.mode !== 'search'
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

  search = debounce(
    async (text?: string) => {
      const { document, getSearchIds } = this.props;
      const link = this.link!;

      if (this.mounted) {
        this.setState({ loading: true });
      }

      const fetchId = ++this.lastFetchId;

      const promises: Promise<Tyr.Document[]>[] = [
        this.linkField!.labels(document!, text),
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
          const existing = documents.find((doc) => addDocument.$id === doc.$id);
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

  render(): React.ReactNode {
    const { props } = this;
    const { mode: controlMode, onSelect, onDeselect } = props;
    const { documents, loading, initialLoading, viewLabel } = this.state;

    if (controlMode === 'view') {
      return decorateField('link', props, () => (
        <span className="tyr-value">{viewLabel}</span>
      ));
    }

    if (initialLoading) return <></>;

    const selectProps: SelectProps<Tyr.AnyIdType | Tyr.AnyIdType[]> = {
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
      loading: !!initialLoading,
    };

    const onTypeChangeFunc = (ev: any) => {
      onTypeChange(props, ev, ev);
      this.props.onChange && this.props.onChange(ev, ev, props);
    };

    if (this.mode === 'tags') {
      selectProps.onChange = async (value) => {
        const values = value as string[];
        const link = this.link!;
        const { onStateChange } = this.props;

        if (link.def.tag) {
          await Promise.all(
            values.map(async (value) => {
              let label = (this.link as any).byIdIndex[value];

              if (!label) {
                label = findByLabel(props, this.link!, value);

                if (!label) {
                  onStateChange && onStateChange({ ready: false });

                  label = await link.save({
                    [link.labelField.path]: value,
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
      selectProps.onSelect = (value: SelectValue, option: any) => {
        const v = findByLabel(props, this.link!, value as string);

        onSelect(
          v
            ? ({ value: v.$id, label: v.$label, document: v } as SelectValue)
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
        {(props.optionFilter ? props.optionFilter(documents) : documents).map(
          this.createOption
        )}
      </Select>
    ));
  }
}

export const TyrLink = withThemedTypeContext<{}>('link', TyrLinkBase);

byName.link = {
  component: TyrLinkBase,

  // Given ids, return the labels
  mapDocumentValueToFormValue(path, value, props) {
    if (
      props?.path?.tail.type.name !== 'array' ||
      props?.path?.detail.link!.isStatic()
    ) {
      return value;
    }

    if (Array.isArray(value)) {
      value = value.map((v) => {
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
    return value?.label || value;
  },

  // Given labels, return the ids
  mapFormValueToDocumentValue(path, value, props) {
    const nv = findByLabel(props!, linkFor(path)!, value);
    if (nv) value = nv.$id;
    return value?.key || value;
  },

  /**
   * Note that this filter handles both the "link" and the "array of link" cases
   */
  filter(filterable, props) {
    const path = props.searchPath || props.path!;

    return {
      filterDropdown: (filterDdProps) => (
        <LinkFilterDropdown
          filterable={filterable}
          filterDdProps={filterDdProps}
          pathProps={props}
        />
      ),
      onFilter: (value, doc) => {
        if (value === undefined) return true;

        if (props.onFilter) return props.onFilter(value, doc);

        const rawVal = path.get(doc);

        if (Array.isArray(rawVal) && Array.isArray(value)) {
          for (const v of value) {
            for (const rv of rawVal) {
              if (v === rv) return true;
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
      },
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
      opts.query[path.spath] =
        Array.isArray(searchValue) && (searchValue as any[]).length
          ? {
              $in: searchValue,
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
  },
};

registerComponent('TyrLink', TyrLink);

// TODO: use real Tyr.Document's so we can get the portrait image as well ?
interface LabelDocument {
  $id: string;
  $label: string;
}

interface LinkFilterProps {
  filterable: Filterable;
  pathProps: TyrPathProps;
  filterDdProps: FilterDdProps;
}

const LinkFilterDropdown = ({
  pathProps,
  filterDdProps,
  filterable,
}: LinkFilterProps) => {
  const path = pathProps.searchPath || pathProps.path!;
  const pathName = path.name;
  const linkField = linkFieldFor(path)!;
  const link = linkField.link!;
  const { localSearch, localDocuments } = filterable;

  const [labels, setLabels] = useState<LabelDocument[] | undefined>(undefined);
  const [filterSearchValue, setFilterSearchValue] = React.useState('');

  let initialValues = filterable.searchValues[pathName];
  if (!Array.isArray(initialValues))
    initialValues = initialValues ? [initialValues] : [];
  // we clone the searchValues here so that modifying them does not trigger a findAll() in the table/etc. control from mobx
  initialValues = Tyr.cloneDeep(initialValues);

  const delaySetLabels = (
    value: React.SetStateAction<LabelDocument[] | undefined>
  ) => {
    setTimeout(() => setLabels(value));
  };

  return (
    <TyrFilter<string[]>
      typeName="link"
      filterable={filterable}
      filterDdProps={filterDdProps}
      pathProps={pathProps}
    >
      {(searchValue, setSearchValue, search) => {
        if (!labels) {
          if (localSearch && localDocuments && pathProps.filterOptionLabel) {
            // Go get all the values for the filter

            const allLabels: LabelDocument[] = [];

            for (const d of localDocuments) {
              const values = pathProps.filterOptionLabel!(d);

              if (Array.isArray(values)) {
                allLabels.push(...values);
              } else if (values) {
                allLabels.push(values);
              }
            }

            delaySetLabels(uniq(compact(allLabels), '$id'));
          } else {
            if (!link.isStatic()) {
              linkField
                .labels(new path.tail.collection({}), filterSearchValue)
                .then((results) => {
                  delaySetLabels(
                    results.map((d) => ({
                      ...d,
                      $id: String(d.$id),
                      $label: d.$label,
                    }))
                  );
                });
            } else {
              delaySetLabels(
                linkFor(path)!.values.map((d) => ({
                  ...d,
                  $id: String(d.$id),
                  $label: d.$label,
                }))
              );
            }
          }
        }

        return (
          <>
            {!pathProps.liveSearch && !link.isStatic() && (
              <Search
                placeholder="search for..."
                size="small"
                className="tyr-filter-search-input"
                onChange={(e) => setFilterSearchValue(e.currentTarget.value)}
                onSearch={async (value) => {
                  const results = await linkField.labels(
                    new path.tail.collection({}),
                    value
                  );
                  setFilterSearchValue(value);
                  setLabels(
                    results.map((d) => ({
                      ...d,
                      $id: String(d.$id),
                      $label: d.$label,
                    }))
                  );
                }}
                enterButton
                value={filterSearchValue}
              />
            )}

            <Menu
              className="ant-table-filter-dropdown ant-dropdown-menu"
              selectedKeys={initialValues}
              mode="vertical"
              multiple={true}
              onClick={
                // this debounce is here because if you clicked on the Menu (and not the contained Checkbox) it would fire this event twice
                _.debounce(({ key }: { key: string }) => {
                  const strKey = String(key);

                  if (searchValue) {
                    const keyIdx = searchValue.indexOf(strKey);

                    if (keyIdx > -1) {
                      searchValue.splice(keyIdx, 1);
                      if (!searchValue.length) searchValue = undefined;
                    } else {
                      searchValue.push(strKey);
                    }
                  } else {
                    searchValue = [strKey];
                  }

                  filterDdProps.setSelectedKeys?.(searchValue || []);
                  setSearchValue(searchValue);
                })
              }
            >
              {sortLabels(labels || link.values, pathProps).map((v) => {
                const isChecked =
                  searchValue && searchValue.indexOf(v.$id) > -1;

                return (
                  <Menu.Item
                    key={v.$id}
                    className="ant-dropdown-menu-item"
                    style={{
                      marginBottom: 0,
                      marginTop: 0,
                      lineHeight: '30px',
                      height: '30px',
                    }}
                  >
                    <Checkbox checked={isChecked}>
                      {pathProps.filterOptionRenderer
                        ? pathProps.filterOptionRenderer(v)
                        : v.$label}
                    </Checkbox>
                  </Menu.Item>
                );
              })}
            </Menu>
          </>
        );
      }}
    </TyrFilter>
  );
};
