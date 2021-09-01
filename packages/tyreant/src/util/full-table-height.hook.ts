import { useState, useEffect } from 'react';
import { useWindowSize } from './window-size.hook';

export const useFullTableHeight = (initialOffset: number = 220) => {
  const windowSize = useWindowSize();
  const [tableHeight, setTableHeight] = useState(0);

  useEffect(() => {
    // Ideally we would measure height of header, height of footer, pagination height and
    // table height = windowSize.height - offset - headerHeight - footerHeight - pagination container height
    setTableHeight(windowSize.height - initialOffset);
  }, [windowSize]);

  return tableHeight;
};

// TODO: If using this and passing in scroll: { y: XXX } to TyrTable, TyrTable should set a min-height on the first .ant-table-body
// equivalent to this value to make sure the table fills the screen, even with very little data-- can we do this with CSS vars?
