import {
  BriefcaseBusiness,
  List,
  Plus,
  ChevronRight,
  ChevronLeft,
  Check,
  FileText,
  CalendarDays,
} from 'lucide-react';

const icons = {
  trips: BriefcaseBusiness,
  list: List,
  plus: Plus,
  arrow: ChevronRight,
  back: ChevronLeft,
  check: Check,
  note: FileText,
  calendar: CalendarDays,
};

export type IconName = keyof typeof icons;

export function Icon({ name }: { name: IconName }) {
  const Component = icons[name];

  return (
    <Component className="icon" size={19} strokeWidth={1.6} aria-hidden="true" focusable="false" />
  );
}
