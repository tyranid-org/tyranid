import * as React from 'react';

import { Tyr } from 'tyranid/client';

import { TyrDecorator, withThemeAndParent } from './decorator';

class TyrPanelBase<D extends Tyr.Document> extends TyrDecorator<D> {
  componentName = 'panel';

  state = {
    visible: true,
    loading: false,
  };

  render() {
    const { children, className } = this.props;
    const title = this.title();

    return (
      <div className={'tyr-panel' + (className ? ' ' + className : '')}>
        {title && (
          <div className="tyr-header tyr-panel-header">
            <h4>{title}</h4>
          </div>
        )}
        {children}
        {this.footer()}
      </div>
    );
  }
}

export const TyrPanel = withThemeAndParent('panel', TyrPanelBase);
