import * as React from 'react';
import { useEffect } from 'react';

import { Row, Col, Checkbox } from 'antd';

import { Tyr } from 'tyranid/client';

import { byName, TyrTypeProps, mapFormValueToDocument } from './type';
import { withThemedTypeContext, TypeContext } from '../core/theme';
import { decorateField } from '../core/path';
import { TyrThemedFieldBase, TyrPathExistsProps } from '../core';
import { registerComponent } from '../common';

interface TyrObjectExtraProps {
  paths?: TyrPathExistsProps[];
}

type TyrObjectProps = TyrTypeProps & TyrObjectExtraProps;

const renderField = (props: TyrObjectProps, pathProps: TyrPathExistsProps) => {
  const { form, document } = props;
  const { path: field } = pathProps;

  return (
    <TyrThemedFieldBase
      {...pathProps}
      path={props.path!.walk(field.name)}
      form={form!}
      document={document!}
    />
  );
};

export const TyrMapLinkToBoolean: React.FunctionComponent<TyrTypeProps> = props => {
  const path = props.path!;
  const { document } = props;
  const field = path.detail;
  const { keys } = field;
  const { link } = keys!;

  //useEffect(() => mapPropsToForm(props), [props.path && props.path.name]);

  //const onTypeChangeFunc = (ev: any) => {
  //onTypeChange(props, ev.target.value, ev);
  //props.onChange && props.onChange(ev.target.value, ev, props);
  //};

  const map = path.get(document) || {};

  const set = (key: any, value: boolean) => {
    let v = path.get(document);
    if (!v) {
      v = {};
      path.set(document!, v);
    }

    v[key] = value;
  };

  return decorateField('map-link-to-boolean', props, () => (
    <>
      {link!.values.map(value => {
        const id = value.$id;
        const cpath = path.walk(id);
        return (
          <Row key={cpath.name} gutter={10}>
            <Col span={24}>
              <Checkbox
                checked={!!map[id]}
                onChange={e => set(id, e.target.checked)}
                // autoComplete="off"
                // autoFocus={props.autoFocus}
                // tabIndex={props.tabIndex}
              >
                {value.$label}
              </Checkbox>
            </Col>
          </Row>
        );
      })}
    </>
  ));
};

export const TyrObjectBase = (props: TyrObjectProps) => {
  const { path, children, paths, document, form } = props;

  let contents: JSX.Element;

  if (path) {
    const field = path.detail;
    const { keys } = field;
    if (keys) {
      const of = field.of!;
      const { link } = keys;

      if (link?.isStatic()) {
        if (of.type.name === 'boolean') {
          contents = <TyrMapLinkToBoolean {...props} />;
        } else {
          contents = (
            <>
              {link.values.map(value => {
                const cpath = path.walk(value.$id);
                return (
                  <Row key={cpath.name} gutter={10}>
                    <Col span={24}>
                      <TyrThemedFieldBase
                        label={value.$label}
                        path={cpath}
                        form={form}
                        document={document}
                      />
                    </Col>
                  </Row>
                );
              })}
            </>
          );
        }
      } else {
        return <div>TODO: map</div>;
      }
    } else {
      contents = (
        <>
          {paths &&
            paths.map(fieldProps => (
              <Row key={fieldProps.path.name} gutter={10}>
                <Col span={24}>{renderField(props, fieldProps)} </Col>
              </Row>
            ))}
          {children}
        </>
      );
    }
  } else {
    contents = (
      <>
        {paths &&
          paths.map(fieldProps => (
            <Row key={fieldProps.path.name} gutter={10}>
              <Col span={24}>{renderField(props, fieldProps)} </Col>
            </Row>
          ))}
        {children}
      </>
    );
  }

  contents = (
    <TypeContext.Provider value={props}>{contents}</TypeContext.Provider>
  );

  const className = props.className;

  return className ? <div className={className}>{contents}</div> : contents;
};

export const TyrObject = withThemedTypeContext<TyrObjectExtraProps>(
  'object',
  TyrObjectBase
);

byName.object = {
  component: TyrObject,
  mapDocumentValueToFormValue(
    path: Tyr.NamePathInstance,
    value: any,
    props: TyrTypeProps
  ) {
    const { detail: field } = path;

    /*
    if (value) {
      value = (value as any[]).map(value =>
        mapDocumentValueToFormValue(path, value)
      );
    }
    */

    return value;
  },
  mapFormValueToDocument(
    path: Tyr.NamePathInstance,
    values: any,
    document: Tyr.Document,
    props: TyrTypeProps
  ) {
    for (const pathName in values) {
      mapFormValueToDocument(
        path.walk(pathName),
        values[pathName],
        document,
        props
      );
    }
  }
};

registerComponent('TyrObject', TyrObject);
