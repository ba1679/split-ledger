import React from 'react';

const shapes = {
  trips: <><rect x="4" y="6" width="16" height="15" rx="2" /><path d="M9 6V3h6v3M4 11h16M9 10v3m6-3v3" /></>,
  list: <path d="M8 5h12M8 12h12M8 19h12M3 5h.01M3 12h.01M3 19h.01" />,
  plus: <path d="M12 5v14M5 12h14" />,
  arrow: <path d="m9 5 7 7-7 7" />,
  back: <path d="m15 5-7 7 7 7" />,
  check: <path d="m5 12 4 4L19 6" />,
  note: <path d="M7 3h10l3 3v15H4V3h3m2 6h6M8 13h8M8 17h5" />,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v5m10-5v5M3 11h18" /></>,
};
export type IconName = keyof typeof shapes;
export function Icon({ name }: { name: IconName }) {
  return <svg aria-hidden="true" focusable="false" className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{shapes[name]}</svg>;
}
