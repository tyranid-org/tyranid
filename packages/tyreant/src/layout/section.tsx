import * as React from 'react';

import { Tyr } from 'tyranid/client';

export interface TyrSectionProps {
  className?: string;
  label?: string;
}

export const TyrSection: React.FunctionComponent<TyrSectionProps> = props => {
  const { className, label, children } = props;

  return (
    <section className={'tyr-section' + (className ? ' ' + className : '')}>
      {label && <label>{label}</label>}
      {children}
    </section>
  );
};
