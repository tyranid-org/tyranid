import { compact, uniq } from 'lodash';
import * as React from 'react';
import { useState } from 'react';

import { Menu, Input, Checkbox } from 'antd';
const { Search } = Input;

import { Tyr } from 'tyranid/client';

import { byName, TyrTypeProps } from './type';
import { withThemedTypeContext } from '../core/theme';
import {
  TyrPathProps,
  TyrComponent,
  getLabelRenderer,
  labelFieldFor,
  labelFor,
} from '../core';
import { TyrFilter, FilterDdProps } from '../core/filter';
import { registerComponent } from '../common';
import {
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

const fixFilterValue = (
  link: Tyr.CollectionInstance,
  filterValue: (string | number)[] | string | number | undefined
) => {
  const linkIdType = link.fields._id.type;

  // ant's filter control loves to convert numbers to strings, so we need to coerce them back
  return Array.isArray(filterValue)
    ? filterValue.map(v => linkIdType.fromString(v))
    : filterValue
    ? [linkIdType.fromString(filterValue)]
    : undefined;
};

byName.link = {
  component: TyrLinkBase,

  mapDocumentValueToFormValue(path, value, props) {
    if (
      props?.path?.tail.type.name !== 'array' ||
      props?.path?.detail.link!.isStatic()
    ) {
      return value;
    }

    //if (Array.isArray(value)) {
    //value = value.map(v => {
    //const nv = findById(props!, linkFor(path)!, v);
    // if (nv) {
    //   const column = (path.tail as any).column;
    //   if (column && column.translateForWhiteLabel) {
    //     return column.translateForWhiteLabel(labelFor(props, nv));
    //   }
    //   return labelFor(props, nv);
    // }
    //return v;
    //});
    //} else {
    //const nv = findById(props!, linkFor(path)!, value as string);
    //if (nv) {
    //const column = (path.tail as any).column;
    //if (column && column.translateForWhiteLabel) {
    //value = column.translateForWhiteLabel(labelFor(props, nv));
    //} else {
    //value = labelFor(props, nv);
    //}
    //}
    //}

    // if collection has label renderer, then return value with labelProjection
    return value; //value?.label || value;
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
  filter(component, props) {
    const path = props.searchPath || props.path!;
    const link = linkFor(path)!;

    return {
      filterDropdown: filterDdProps => (
        <LinkFilterDropdown
          component={component}
          filterDdProps={filterDdProps}
          pathProps={props}
        />
      ),
      onFilter: (filterValue, doc) => {
        if (filterValue === undefined) return true;

        filterValue = fixFilterValue(link, filterValue);

        if (props.onFilter) return props.onFilter(filterValue, doc);

        const docValue = path.get(doc);

        if (Array.isArray(docValue)) {
          if (Array.isArray(filterValue)) {
            for (const fv of filterValue)
              if (docValue.indexOf(fv) > -1) return true;

            return false;
          } else {
            return docValue.indexOf(filterValue) > -1;
          }
        } else {
          return Array.isArray(filterValue)
            ? filterValue.indexOf(docValue) > -1
            : filterValue === docValue;
        }
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

  finder(path, opts, searchValue, pathProps) {
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
      Tyr.assignDeep(opts.populate, {
        [path.spath]: link.labelProjection(pathProps?.labelField),
      });
    }
  },

  cellValue(path, document, props) {
    const link = linkFor(path);
    const { detail: field } = path;

    if (path.tail.type.name === 'array') {
      // array of links
      const arr = path.get(document);

      if (Array.isArray(arr)) {
        return arr
          .map((val, idx) =>
            byName.link.cellValue!(path.walk(idx), document, props)
          )
          .join(', ');
      } else {
        return arr;
      }
    }

    if (field.isId()) return labelFor(props, document);

    if (link) {
      const lf = labelFieldFor(props, link);
      if (lf && !link.isStatic()) {
        const v = path.get(document);
        if (!v) return undefined;

        path = path.walk(lf.name);
        const populatedLabelValue = path.get(document);
        if (populatedLabelValue) {
          const { detail } = path;
          return detail.type.format(detail, populatedLabelValue);
        }

        const linkedDoc = link!.byIdIndex[v];
        if (linkedDoc) return labelFor(props, linkedDoc);

        // TODO:  queue up a label query and a rerender?
        return 'N/A';
      }
    }

    return field.type
      ? field.type.format(field, path.get(document))
      : 'Unknown Link';
  },
};

interface LinkFilterProps {
  component: TyrComponent<any>;
  pathProps: TyrPathProps<any>;
  filterDdProps: FilterDdProps;
}

const LinkFilterDropdown = ({
  pathProps,
  filterDdProps,
  component,
}: LinkFilterProps) => {
  const path = pathProps.searchPath || pathProps.path!;
  const pathName = path.name;
  const linkField = linkFieldFor(path)!;
  const link = linkField.link!;
  const { type: linkIdType } = link.fields._id;
  const { local, allDocuments } = component;

  const [labels, setLabels] = useState<Tyr.Document[] | undefined>(undefined);
  const [filterSearchValue, setFilterSearchValue] = React.useState('');

  let initialValues = component.filterValue(pathName);
  if (!Array.isArray(initialValues))
    initialValues = initialValues ? [initialValues] : [];
  // we clone the searchValues here so that modifying them does not trigger a findAll() in the table/etc. control from mobx
  initialValues = Tyr.cloneDeep(initialValues);

  const delaySetLabels = (
    value: React.SetStateAction<Tyr.Document[] | undefined>
  ) => {
    setTimeout(() => setLabels(value));
  };

  return (
    <TyrFilter<string[]>
      typeName="link"
      component={component}
      filterDdProps={filterDdProps}
      pathProps={pathProps}
    >
      {(filterValue, setFilterValue) => {
        filterValue = fixFilterValue(link, filterValue);

        if (!labels) {
          if (local) {
            if (allDocuments) {
              const allLabels: Tyr.Document[] = [];

              if (pathProps.filterOptionLabel) {
                for (const d of allDocuments) {
                  const values = pathProps.filterOptionLabel!(
                    d
                  ) as Tyr.Document[];

                  if (Array.isArray(values)) {
                    allLabels.push(...values);
                  } else if (values) {
                    allLabels.push(values);
                  }
                }
              } else {
                const add = (v: Tyr.AnyIdType) => {
                  const lv = link.byIdIndex[v];
                  if (lv) allLabels.push(lv);
                  //else TODO:  queue up a label find ?
                };

                for (const d of allDocuments) {
                  const values = path.get(d);
                  if (Array.isArray(values)) {
                    for (const v of values) {
                      add(v);
                    }
                  } else if (values !== undefined) {
                    add(values);
                  }
                }
              }

              delaySetLabels(uniq(compact(allLabels), '$id'));
            }
          } else {
            if (!link.isStatic()) {
              const { labelField } = pathProps;
              linkField
                .labels(
                  new path.tail.collection({}),
                  filterSearchValue,
                  labelField ? { labelField } : undefined
                )
                .then(results => {
                  delaySetLabels(
                    results.map(d => ({
                      ...d,
                      $id: d.$id,
                      $label: labelFor(pathProps, d),
                    }))
                  );
                });
            } else {
              delaySetLabels(
                link.values.map(d => ({
                  ...d,
                  $id: d.$id,
                  $label: labelFor(pathProps, d),
                }))
              );
            }
          }
        }

        const labelRenderer = getLabelRenderer(pathProps);

        return (
          <>
            {!component.local && !link.isStatic() && (
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
                      $id: d.$id,
                      $label: labelFor(pathProps, d),
                    }))
                  );
                }}
                enterButton
                autoFocus={true}
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
                  const fv = linkIdType.fromString(key);
                  if (filterValue) {
                    const keyIdx = filterValue.indexOf(fv);

                    if (keyIdx > -1) {
                      filterValue.splice(keyIdx, 1);
                      if (!filterValue.length) filterValue = undefined;
                    } else {
                      filterValue.push(fv);
                    }
                  } else {
                    filterValue = [fv];
                  }

                  filterDdProps.setSelectedKeys?.(filterValue || []);

                  setFilterValue(filterValue);
                })
              }
            >
              {sortLabels(labels || link.values, pathProps).map(v => {
                const isChecked = Array.isArray(filterValue)
                  ? filterValue.indexOf(v.$id) > -1
                  : filterValue === v.$id;

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
                    <Checkbox checked={isChecked}>{labelRenderer(v)}</Checkbox>
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
