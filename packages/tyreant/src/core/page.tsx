import * as React from 'react';
import { Link, Route } from 'react-router-dom';

import { Tyr } from 'tyranid/client';

// TODO:  is it possible to import this via tsconfig ?
import 'tyranid/builtin/isomorphic';
import 'tyranid/builtin/client';

import { TyrTable } from './table';
import { TyrForm } from './form';
import { registerComponent, componentsByName } from '../common';
import { TyrModal } from './modal';
import { TyrField } from './field';

const { TyrPage: TyrPageCol, TyrMarkupType } = Tyr.collections;

interface PageCacheEntry {
  page: Tyr.TyrPage;
  html: React.ReactElement[];
}

const pageCache: { [name: string]: PageCacheEntry | null } = {};

export type TyrPageProps = Readonly<{ path: string }>;

function parseHtml(content: string) {
  const tmp = document.implementation.createHTMLDocument();
  tmp.body.innerHTML = content;
  return tmp.body.childNodes;
}

function translateDomAttributes(content: Element) {
  const attributes = content.attributes,
    len = attributes.length;

  if (!len) return undefined;

  const props: { [name: string]: any } = {};

  for (let i = 0; i < len; ) {
    const attribute = attributes[i++];
    const { name, value } = attribute;

    switch (name) {
      case 'class':
        props.className = value;
        break;
      case 'style':
        if (content instanceof HTMLElement) {
          // this didn't work
          //props.style = content.style;
          const { style } = content;
          const newStyle: { [name: string]: any } = {};
          for (let i = 0; i < style.length; ) {
            const prop = style[i++];
            newStyle[prop] = (style as any)[prop];
          }

          props.style = newStyle;
        }
        break;
      default:
        props[name] = value;
    }
  }

  return props;
}

function translateDomToReact(content: NodeList) {
  const { length } = content;
  const reactEls: React.ReactElement[] = new Array(length);

  for (let i = 0; i < length; i++) {
    const e = content[i];

    if (e instanceof Element) {
      const { tagName } = e;

      let props = translateDomAttributes(e);
      if (props) {
        props.key = i;
      } else {
        props = { key: i };
      }

      const { childNodes } = e;

      if (tagName === 'A') {
        reactEls[i] = (
          <Link to={props.href} {...props}>
            {translateDomToReact(e.childNodes)}
          </Link>
        );
      } else {
        reactEls[i] = React.createElement(
          componentsByName[tagName] || tagName.toLowerCase(),
          props,
          ...(childNodes.length
            ? translateDomToReact(e.childNodes)
            : [e.innerHTML])
        );
      }
    } else if (e instanceof Text) {
      // how to avoid this span?  can't use <></> since can't put a key on that?
      reactEls[i] = <span key={i}>{e.wholeText}</span>;
      //reactEls[i] = <>{e.wholeText}</>;
      //reactEls[i].key = i; // did not work
    }
  }

  return reactEls;
}

function translateHtml(content: string) {
  return translateDomToReact(parseHtml(content) as NodeList);
}

interface TyrPageState extends PageCacheEntry {}

export class TyrPage extends React.Component<TyrPageProps, TyrPageState> {
  state: TyrPageState = {} as TyrPageState;

  async componentWillMount() {
    const { path } = this.props;
    let pageEntry = pageCache[path];

    if (!pageEntry) {
      const page = await TyrPageCol.findOne({
        query: { path }
      });

      let html: React.ReactElement[] | undefined;

      if (page) {
        const { content } = page;
        if (content) {
          switch (content.type) {
            case TyrMarkupType.HTML._id:
              html = translateHtml(content.content);
              break;
          }
        }
      }

      pageEntry = pageCache[path] = {
        page: page!,
        html: html!
      };
    }

    this.setState(pageEntry);
  }

  render() {
    const { page, html } = this.state;

    if (!page) {
      return <div className="tyr-loading-page"></div>;
    }

    const { content } = page;
    if (!content) {
      return <div className="tyr-no-content"></div>;
    }

    switch (content.type) {
      case TyrMarkupType.MARKDOWN._id:
        return <div />;
      case TyrMarkupType.HTML._id:
        return html;
      case TyrMarkupType.SASS._id:
        // TODO:  what does this even mean?
        return <div />;
    }

    return <div></div>;
  }
}

registerComponent('TyrPage', TyrPage);

export const TyrPageAdmin = () => (
  <TyrTable
    collection={TyrPageCol}
    config={true}
    export={true}
    fields={[{ field: 'path' }]}
    actions={[
      {
        name: 'preview',
        action: async opts => {
          const path = opts.document?.path;
          if (path) location.href = path;
          return true;
        }
      }
    ]}
  >
    <TyrForm<Tyr.TyrPage> decorator={<TyrModal className="tyr-page-editor" />}>
      {({ document }) => (
        <>
          <TyrField path="path" />
          <a href={document.path}>preview</a>
          <TyrField path="content" />
        </>
      )}
    </TyrForm>
  </TyrTable>
);

registerComponent('TyrPageAdmin', TyrPageAdmin);

export const generatePageRoutes = async () => {
  const pages = await TyrPageCol.findAll({
    query: { path: /^\// },
    fields: { path: 1 }
  });

  return pages.map(page => (
    <Route
      key={page.path}
      path={page.path}
      render={() => <TyrPage path={page.path!} />}
    />
  ));
  //<Route path="/admin/page" render={() => <TyrPageAdmin />} />
};
