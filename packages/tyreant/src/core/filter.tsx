import * as React from 'react';
import { useState } from 'react';

import {
  CloseOutlined,
  FilterTwoTone,
  SearchOutlined,
} from '@ant-design/icons';

import { Button, Drawer, Popover, Input } from 'antd';
import {
  ColumnFilterItem,
  FilterDropdownProps,
} from 'antd/lib/table/interface';

import { Tyr } from 'tyranid/client';

import { TyrPathProps } from './path';
import { useComponent, TyrComponent } from './component';
import { TyrManyComponent } from './many-component';
import { TyrSearchBar } from '.';

export interface FilterDdProps extends FilterDropdownProps {
  filtersContainer?: boolean;
}

export type Filter = (
  component: TyrComponent<any>,
  props: TyrPathProps<any>
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
  path: Tyr.PathInstance,
  opts: any /* TODO: add Tyr.Options_Find to client */,
  searchValue: any,
  pathProps?: TyrPathProps<any>
) => void;

export interface TyrFilterProps<SearchValueType> {
  typeName: string;
  component: TyrComponent<any>;
  pathProps: TyrPathProps<any>;
  filterDdProps: FilterDdProps;
  children: (
    filterValue: SearchValueType | undefined,
    setFilterValue: (v: SearchValueType | undefined) => void,
    search: (onChange?: boolean) => void
  ) => React.ReactNode;
}

export function TyrFilter<FilterValueType>({
  typeName,
  pathProps,
  component,
  filterDdProps,
  children,
}: TyrFilterProps<FilterValueType>) {
  const { path } = pathProps;
  const pathName = path!.name;

  const [filterValue, setFilterValue] = useState<FilterValueType | undefined>(
    component.filterValue(pathName)
  );

  React.useEffect(() => {
    setFilterValue(component.filterValue(pathName));
  }, [component.filterValue(pathName)]);

  const onSearch = (outerSearch?: boolean) => {
    if (!outerSearch) {
      (component as TyrManyComponent).skip = 0;
      (component as TyrManyComponent).query();
    }

    const value = component.filterValue(pathName);

    component.updateConfigFilter(pathName, value);
    if (value === undefined || value === null) filterDdProps.clearFilters?.();
  };

  const setLiveSetFilterValue = (value: FilterValueType | undefined) => {
    setFilterValue(value);

    if (component.local) {
      component.filterValues[pathName] = value;
      onSearch();
    }
  };

  const clear = () => {
    delete component.filterValues[pathName];
    setFilterValue(undefined);
    onSearch();
  };

  const search = (onChange?: boolean, outerSearch?: boolean) => {
    component.filterValues[pathName] = filterValue;
    onSearch(outerSearch);
    if (!onChange) filterDdProps.confirm?.();
  };

  component.filterConnections[pathName] = {
    clear,
    search,
    filterValue,
    setFilterValue,
  };

  return (
    <div className={`tyr-filter tyr-${typeName}-filter`}>
      {children(filterValue, setLiveSetFilterValue, search)}
      {!filterDdProps.filtersContainer && (
        <div className="tyr-filter-footer">
          <Button onClick={() => clear()} size="small" style={{ width: 90 }}>
            Reset
          </Button>

          {!component.local && (
            <Button
              type="primary"
              onClick={() => search()}
              icon={<SearchOutlined />}
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
  search: (onChange?: boolean, outerSearch?: boolean) => void;
  filterValue: any;
  setFilterValue: (v: any) => void;
}

// TODO:  write this as a regular component ala TyrImport / TyrExport / TyrRemove / etc.
//        using a TyrDrawer
export const TyrFilters = ({
  component,
}: {
  component?: TyrComponent<any>;
}) => {
  const [visible, setVisible] = useState(false);
  const drawerBodyRef = React.useRef<HTMLDivElement | null>(null);

  const c = component || useComponent();
  if (!c) return <div className="no-component" />;
  const paths = (c.paths as TyrPathProps<any>[]).filter(
    pathProps => pathProps.path
  );
  if (!paths) return <div className="no-paths"></div>;

  const body = (
    <div key="filter-fields-body" ref={drawerBodyRef}>
      {paths.map(f => {
        const path = f.path!;

        const filter = c.getFilter(f);
        if (!filter) return <div className="no-filter" key={path.name} />;

        const { filterDropdown } = filter;

        if (filterDropdown) {
          return (
            <div className="tyr-filter-container" key={path.name}>
              <h1>{path.label}</h1>
              {typeof filterDropdown === 'function'
                ? filterDropdown({
                    prefixCls: '',
                    setSelectedKeys: (selectedKeys: Tyr.AnyIdType[]) =>
                      c.refresh(),
                    selectedKeys: [],
                    confirm: () => c.query(),
                    clearFilters: () => {},
                    //filters?: ColumnFilterItem[];
                    //getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement;
                    visible: true,
                    filtersContainer: true,
                  })
                : filterDropdown}
            </div>
          );
        }

        return (
          <div className="tyr-filter-container" key={path.name}>
            {path.name} Filter TODO
          </div>
        );
      })}
    </div>
  );

  const { filterConnections } = c;

  const footer = (
    <React.Fragment key="filter-action-btns">
      <Button
        key="reset-filter-btn"
        onClick={() => {
          for (const name in filterConnections)
            filterConnections[name]?.clear();
          setVisible(false);
        }}
        size="small"
        style={{ width: 90 }}
      >
        Reset
      </Button>

      {!c.local && (
        <Button
          key="search-filter-btn"
          type="primary"
          onClick={() => {
            for (const name in filterConnections)
              filterConnections[name]?.search(false, true);
            setVisible(false);
            setTimeout(() => c.requery(), 1);
          }}
          icon={<SearchOutlined />}
          size="small"
          style={{ width: 90 }}
        >
          Search
        </Button>
      )}
    </React.Fragment>
  );

  const title = c.collection.label + ' Filters';

  const filterTheme = c.props.theme?.filter;

  const filterIcon = filterTheme?.icon || (
    <FilterTwoTone twoToneColor="#386695" />
  );

  const searchBar = (
    <div
      className={`${
        (c as TyrManyComponent).props.searchBar
          ? ''
          : 'tyr-filter-search-bar-no-input '
      }tyr-filter-search-bar tyr-action`}
      key="search-bar"
    >
      <Button
        className={
          'tyr-filters-btn' + (c.filtering ? ' tyr-filters-active' : '')
        }
        onClick={() => setVisible(true)}
      >
        {filterIcon}
      </Button>
      {(c as TyrManyComponent).props.searchBar && (
        <TyrSearchBar component={c} />
      )}
    </div>
  );

  switch (filterTheme?.as) {
    case 'popover':
      return (
        <Popover
          overlayClassName="tyr-filters tyr-popover"
          title={title}
          trigger="click"
          visible={visible}
          placement="bottomLeft"
          onVisibleChange={setVisible}
          align={{ offset: [0, -3] }}
          content={
            <>
              <div className="tyr-filter-body">{body}</div>
              <div className="tyr-filter-footer">{footer}</div>
            </>
          }
        >
          {searchBar}
        </Popover>
      );
    default:
      return (
        <div>
          <Drawer
            visible={visible}
            closable={true}
            onClose={() => setVisible(false)}
            placement="left"
            className="tyr-filters tyr-drawer"
            title={title}
            width={280}
            footer={footer}
            afterVisibleChange={isVisible => {
              // When drawer opens, scroll to the top
              if (isVisible && drawerBodyRef?.current) {
                let parent = drawerBodyRef?.current?.parentElement;

                while (
                  parent &&
                  !parent.className.includes('ant-drawer-body')
                ) {
                  parent = parent?.parentElement;
                }

                if (parent) {
                  parent.scrollTo(0, 0);
                }
              }
            }}
          >
            {body}
          </Drawer>
          {searchBar}
        </div>
      );
  }
};

export const TyrTagSet = ({
  label,
  children,
}: {
  label: string;
  children?: React.ReactNode;
}) => (
  <div className="tyr-tag-set">
    <label>{label}</label>
    {children}
  </div>
);

export const TyrTag = <C extends Tyr.CollectionInstance>({
  id,
  collection,
  onClick,
}: {
  id: Tyr.IdType<Tyr.DocumentType<C>>;
  collection: C;
  onClick?: (filterValue: any) => void;
}) => {
  const [label, setLabel] = React.useState<string | undefined>(
    collection.byIdIndex[id]?.$label
  );

  const loadLabel = async () => {
    // When there is no id (null or undefined, the label gets passed, not the id)
    if (typeof id === 'string' && !id.match(/^[0-9a-fA-F]{24}$/)) {
      setLabel(Tyr.labelize(id || '?'));
    } else {
      setLabel(await collection.idToLabel(id));
    }
  };

  React.useEffect(() => {
    if (!label) {
      loadLabel();
    }
  }, []);

  return label ? (
    <div className="tyr-tag" onClick={() => onClick?.(id)}>
      {label}
      <CloseOutlined />
    </div>
  ) : (
    <></>
  );
};

function unselect(set: any[] | any, value: any): any {
  if (Array.isArray(set)) {
    set = set.filter(v => v !== value);
    if (!set.length) set = undefined;
  } else {
    if (set === value) set = undefined;
  }

  return set;
}

export const TyrFilterSummary = ({
  component,
}: {
  component?: TyrComponent<any>;
}) => {
  const c = component || useComponent();

  if (!c) return <div className="no-component" />;

  const tags: JSX.Element[] = [];

  const { filterValues } = c;
  for (const pathName in filterValues) {
    const fv = filterValues[pathName];

    if (fv) {
      const pathProps = c.activePath(pathName);
      if (pathProps) {
        const { path } = pathProps;
        const { link } = path.detail;

        const onClick = (id: any) => {
          c.setFilterValue(pathName, unselect(c.filterValue(pathName), id));
          c.query();
        };

        if (link) {
          if (Array.isArray(fv)) {
            tags.push(
              <TyrTagSet key={link.id} label={path.label}>
                {fv.map(fv => (
                  <TyrTag
                    key={fv}
                    id={fv}
                    collection={link}
                    onClick={onClick}
                  />
                ))}
              </TyrTagSet>
            );
          } else {
            tags.push(
              <TyrTagSet key={link.id} label={path.label}>
                <TyrTag key={fv} id={fv} collection={link} onClick={onClick} />
              </TyrTagSet>
            );
          }
        }
      }
    }
  }

  return <div className="tyr-filter-summary">{tags}</div>;
};
