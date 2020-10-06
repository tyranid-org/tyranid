import * as React from 'react';
import { useState } from 'react';

/*
type RerenderableApi = {
  refresh(): void;
  props: any;
};

const Rerenderable = (
  Child: any,
  onSetReloadApi: (api: { refresh(): void; props: any }) => void
) => (props: any) => {
  const [count, setCount] = useState(0);

  onSetReloadApi({ refresh: () => setCount(count + 1), props });

  console.log('rerendering inner table', count);
  return (
    <Child count={count} {...props}>
      {props.children}
    </Child>
  );
};
Rerenderable.whyDidYouRender = true;
*/

const useRerender = () => {
  const [changes, setChanges] = useState(0);

  return () => {
    setChanges(changes + 1);
  };
};

export default useRerender;
