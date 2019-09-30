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
  initialLoading: boolean;
}

const linkFor = (path: Tyr.NamePathInstance) => {
  const { detail: field } = path;

  if (field.type.name === 'array' && field.of!.type.name === 'link') {
    return field.of!.link;
  } else if (field.link) {
    return field.link;
  }
};

// TODO:  replace with collection.byLabel(label) once that is fixed to perform a case-insensitive search....
const findByLabel = (collection: Tyr.CollectionInstance, label: string) => {
  label = label.toLowerCase();

  return collection.values.find(lv => {
    const l = lv.$label;
    return l ? l.toLowerCase() === label : false;
  });
};

const findById = (collection: Tyr.CollectionInstance, id: string) =>
  collection.values.find(lv => lv.$id === id);

const sortLabels = (labels: any[], searchSortById?: boolean) => {
  labels.sort((a, b) => {
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

  return labels;
};

export class TyrLinkBase extends React.Component<TyrTypeProps, TyrLinkState> {
  state: TyrLinkState = { documents: [], loading: false, initialLoading: true };

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
    const { path, searchPath } = props;

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

    if (!this.link) throw new Error('TyrLink passed a non-link');

    if (this.link.isStatic()) {
      this.setState({
        initialLoading: false,
        documents: sortLabels(this.link.values, !!props.searchSortById)
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
          : getSearchIds ? getSearchIds(val) : val;

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
        documents: sortLabels(documents, !!this.props.searchSortById),
        loading: false,
        initialLoading: false
      });
    }
  }, 200);

  render(): React.ReactNode {
    const { props } = this;
    const { mode: controlMode, path, multiple, onSelect, onDeselect } = props;
    const { documents, loading, initialLoading } = this.state;

    if (controlMode === 'view') {
      return (
        <label>{path!.tail.link!.idToLabel(path!.get(props.document))}</label>
      );
    }

    const { tail: field } = path!;

    let mode: typeof selectProps.mode;
    // TODO:  'tags', 'combobox'
    if (field.type.name === 'array') {
      mode =
        field.of!.link &&
        field.of!.link!.def.tag &&
        this.props.mode !== 'search'
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

        onTypeChangeFunc(value);
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
      <Select
        {...selectProps}
        onChange={selectProps.onChange || onTypeChangeFunc}
      >
        {documents.map(this.createOption)}
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
    const link = linkFor(path)!;

    if (!link.isStatic()) {
      path.tail.labels(new path.tail.collection({})).then(results => {
        filterValues = results.map(d => {
          return {
            ...d,
            $id: String(d.$id),
            $label: d.$label
          };
        });
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

  return {
    filterDropdown: (filterDdProps: FilterDropdownProps) => (
      <div className="search-box" style={{ padding: 0 }}>
        <Menu
          className="ant-table-filter-dropdown ant-dropdown-menu"
          style={{ maxHeight: '360px', overflowX: 'hidden', padding: 0 }}
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
      if (props.onFilter) {
        return props.onFilter(value, doc);
      }

      const val = path.get(doc);

      if (Array.isArray(value)) {
        if (!value.length) {
          return true;
        }

        if (Array.isArray(val)) {
          for (const v of val) {
            if (value.indexOf(v) > -1) {
              return true;
            }
          }

          return false;
        }

        return value.indexOf(val) > -1;
      }

      if (Array.isArray(val)) {
        return val.indexOf(value) > -1;
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
    const nv = findByLabel(linkFor(path)!, value);
    if (nv) value = nv.$id;
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
    }

    return field.type.format(field, path.get(document));
  }
};
