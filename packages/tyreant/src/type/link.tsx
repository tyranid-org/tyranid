import { compact, uniq } from 'lodash';
import * as React from 'react';
import { useState } from 'react';

import { Menu, Input, Checkbox } from 'antd';
const { Search } = Input;

import { Tyr } from 'tyranid/client';

import { byName, TyrTypeProps } from './type';
import { withThemedTypeContext } from '../core/theme';
import { TyrPathProps } from '../core';
import { TyrFilter, FilterDdProps, Filterable } from '../core/filter';
import { registerComponent } from '../common';
import {
  findById,
  findByLabel,
  linkFor,
  linkFieldFor,
  sortLabels,
} from './link.abstract';
import { TyrLinkAutoComplete } from './link.autocomplete';
import { TyrLinkRadio } from './link.radio';
import { TyrLinkSelect } from './link.select';

export const TyrLinkBase = <D extends Tyr.Document = Tyr.Document>(
  props: TyrTypeProps<D>
) => {
  if (props.path?.name === '_id') return <TyrLinkAutoComplete {...props} />;
  else if (props.as === 'radio') return <TyrLinkRadio {...props} />;
  else return <TyrLinkSelect {...props} />;
};

export const TyrLink = withThemedTypeContext('link', TyrLinkBase);

registerComponent('TyrLink', TyrLink);

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
      filterDropdown: filterDdProps => (
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

// TODO: use real Tyr.Document's so we can get the portrait image as well ?
interface LabelDocument {
  $id: string;
  $label: string;
}

interface LinkFilterProps {
  filterable: Filterable;
  pathProps: TyrPathProps<any>;
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
                .then(results => {
                  delaySetLabels(
                    results.map(d => ({
                      ...d,
                      $id: String(d.$id),
                      $label: d.$label,
                    }))
                  );
                });
            } else {
              delaySetLabels(
                linkFor(path)!.values.map(d => ({
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
                onChange={e => setFilterSearchValue(e.currentTarget.value)}
                onSearch={async value => {
                  const results = await linkField.labels(
                    new path.tail.collection({}),
                    value
                  );
                  setFilterSearchValue(value);
                  setLabels(
                    results.map(d => ({
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
              {sortLabels(labels || link.values, pathProps).map(v => {
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
