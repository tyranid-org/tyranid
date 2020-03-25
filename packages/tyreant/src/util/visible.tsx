import * as React from 'react';
import { useContext, useEffect, useState } from 'react';

//
// IntersectionObserver
//

export type IntersectionObserverCallback = (
  entry: IntersectionObserverEntry
) => void;

export const TyrIntersectionObserverContext = React.createContext<
  TyrIntersectionObserver | undefined
>(undefined);

export interface TyrIntersectionObserverProps {
  scrollArea: Element | null;
  children?: React.ReactNode;
}

export class TyrIntersectionObserver extends React.Component<
  TyrIntersectionObserverProps
> {
  subscribers = new WeakMap<Element, IntersectionObserverCallback>();

  io: IntersectionObserver;

  constructor(props: TyrIntersectionObserverProps) {
    super(props);

    const { subscribers } = this;
    const { scrollArea } = props;

    this.io = new IntersectionObserver(
      entries =>
        entries.forEach(entry =>
          subscribers.get(entry.target)!.call(null, entry)
        ),
      {
        root: scrollArea,
        rootMargin: '0px',
        threshold: 0.1
      }
    );
  }

  observe(domNode: Element, callback: IntersectionObserverCallback) {
    const { io, subscribers } = this;

    if (!domNode || subscribers.has(domNode)) {
      return;
    }

    subscribers.set(domNode, callback);
    io.observe(domNode);

    return () => this.unobserve(domNode);
  }

  unobserve(domNode: Element) {
    this.io.unobserve(domNode);
    this.subscribers.delete(domNode);
  }

  render() {
    return (
      <TyrIntersectionObserverContext.Provider value={this}>
        {this.props.children}
      </TyrIntersectionObserverContext.Provider>
    );
  }
}

//
// HOC
//

/*export const withIsVisible = <Props extends {}>(
  WrappedComponent: React.ComponentType
) => (props: Props) => {
  const ref = useRef();

  return (
    <TyrIntersectionObserver scrollArea={ref.current}>
      <WrappedComponent ref={ref}></WrappedComponent>
    </TyrIntersectionObserver>
  );
};*/

//
// Hook
//

export function useIsVisible(el: Element | null) {
  const [visible, setVisible] = useState(false);

  const io = useContext(TyrIntersectionObserverContext);

  useEffect(() => {
    if (el) io!.observe(el, ({ isIntersecting }) => setVisible(isIntersecting));
  }, [el]);

  return visible;
}
