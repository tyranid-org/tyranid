import * as React from 'react';
import { useState } from 'react';

import { Button, Icon, Popover } from 'antd';
import { ColumnFilterItem, FilterDropdownProps } from 'antd/lib/table';

import { Tyr } from '../tyreant';
import { TyrFieldProps } from './field';
import { useComponent, TyrComponent } from './component';

export interface Filterable {
  searchValues: { [pathName: string]: any };
  onSearch(): void;

  localSearch: boolean;
  localDocuments?: Tyr.Document<any>[];
}

export type Filter = (
  filterable: Filterable,
  props: TyrFieldProps
) =>
  | {
      filterDropdown?:
        | React.ReactNode
        | ((props: FilterDdProps) => React.ReactNode);
      filterIcon?: React.ReactNode;
      onFilter?: (value: any, doc: Tyr.Document) => boolean;
      onFilterDropdownVisibleChange?: (visible: boolean) => void;
      filterDropdownVisible?: boolean;
      filters?: ColumnFilterItem[];
    }
  | undefined;

export type Finder = (
  path: Tyr.NamePathInstance,
  opts: any /* TODO: add Tyr.Options_Find to client */,
  searchValue: any
) => void;

export interface TyrFilterProps<SearchValueType> {
  typeName: string;
  filterable: Filterable;
  fieldProps: TyrFieldProps;
  filterDdProps: FilterDdProps;
  children: (
    searchValue: SearchValueType | undefined,
    setSearchValue: (v: SearchValueType | undefined) => void,
    search: (onChange?: boolean) => void
  ) => React.ReactNode;
}

export function TyrFilter<SearchValueType>({
  typeName,
  fieldProps,
  filterable,
  filterDdProps,
  children
}: TyrFilterProps<SearchValueType>) {
  const { field } = fieldProps;
  const pathName = field!.namePath.name;

  const [searchValue, setSearchValue] = useState<SearchValueType | undefined>(
    filterable.searchValues[pathName]
  );

  const clear = () => {
    delete filterable.searchValues[pathName];
    setSearchValue(undefined);
    filterDdProps.clearFilters?.([]);
    filterable.onSearch();
  };

  const search = (onChange?: boolean) => {
    filterable.searchValues[pathName] = searchValue;
    filterable.onSearch();
    if (!onChange) filterDdProps.confirm?.();
  };

  const { connect } = filterDdProps;
  if (connect) connect({ clear, search, searchValue, setSearchValue });

  return (
    <div className={`tyr-filter tyr-${typeName}-filter`}>
      {children(searchValue, setSearchValue, search)}
      {!filterDdProps.connect && (
        <div className="tyr-filter-footer">
          <Button onClick={() => clear()} size="small" style={{ width: 90 }}>
            Reset
          </Button>

          {!fieldProps.liveSearch && (
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
      )}
    </div>
  );
}

export interface TyrFilterConnection {
  clear: () => void;
  search: () => void;
  searchValue: any;
  setSearchValue: (v: any) => void;
}

export interface FilterDdProps extends FilterDropdownProps {
  connect?: (connection: TyrFilterConnection) => void;
}

export const TyrFilters = ({ component }: { component?: TyrComponent }) => {
  const [connections] = useState<{
    [name: string]: TyrFilterConnection;
  }>({});

  const [visible, setVisible] = useState(false);
  const c = component || useComponent();
  if (!c) return <div className="no-component" />;
  const fields = c.fields?.filter(f => f.field);
  if (!fields) return <div className="no-fields"></div>;

  return (
    <Popover
      overlayClassName="tyr-filters"
      title="Filters"
      trigger="click"
      visible={visible}
      placement="bottomLeft"
      onVisibleChange={setVisible}
      align={{ offset: [0, -3] }}
      content={
        <>
          <div className="tyr-filter-body">
            {fields.map(f => {
              const field = f.field!;

              const filter = c.getFilter(f);
              if (!filter) return <div className="no-filter" />;

              const { filterDropdown } = filter;

              if (filterDropdown) {
                return (
                  <div className="tyr-filter-container" key={field.name}>
                    <h1>{field.label}</h1>
                    {typeof filterDropdown === 'function'
                      ? filterDropdown({
                          //prefixCls?: string;
                          setSelectedKeys: (selectedKeys: string[]) => {
                            c.refresh();
                          },
                          //selectedKeys: string[],
                          confirm: () => {
                            c.requery();
                          },
                          clearFilters: (selectedKeys: string[]) => {},
                          //filters?: ColumnFilterItem[];
                          //getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement;
                          connect: connection => {
                            connections[field.name] = connection;
                          }
                        })
                      : filterDropdown}
                  </div>
                );
              }

              return (
                <div className="tyr-filter-container" key={f.field!.name}>
                  {f.field!.name} Filter TODO
                </div>
              );
            })}
          </div>
          <div className="tyr-filter-footer">
            <Button
              onClick={() => {
                for (const name in connections) connections[name]?.clear();
                setVisible(false);
              }}
              size="small"
              style={{ width: 90 }}
            >
              Reset
            </Button>

            {!c.isLocal && (
              <Button
                type="primary"
                onClick={() => {
                  for (const name in connections) connections[name]?.search();
                  setVisible(false);
                }}
                icon="search"
                size="small"
                style={{ width: 90 }}
              >
                Search
              </Button>
            )}
          </div>
        </>
      }
    >
      <Button>
        <Icon type="filter" theme="twoTone" twoToneColor="#386695" />
      </Button>
    </Popover>
  );
};
