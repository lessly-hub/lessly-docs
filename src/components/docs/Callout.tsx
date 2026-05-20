import { AlertOctagon, AlertTriangle, Info, Lightbulb } from 'lucide-react';
import type { ReactNode } from 'react';

type CalloutType = 'note' | 'info' | 'tip' | 'warning' | 'danger';

const config: Record<
  CalloutType,
  {
    icon: typeof Info;
    label: string;
    bg: string;
    fg: string;
  }
> = {
  note:    { icon: Info,          label: 'Note',    bg: 'bg-bg-brand-subtle',   fg: 'text-text-brand'   },
  info:    { icon: Info,          label: 'Info',    bg: 'bg-bg-brand-subtle',   fg: 'text-text-brand'   },
  tip:     { icon: Lightbulb,     label: 'Tip',     bg: 'bg-bg-success-subtle', fg: 'text-text-success' },
  warning: { icon: AlertTriangle, label: 'Warning', bg: 'bg-bg-warning-subtle', fg: 'text-text-warning' },
  danger:  { icon: AlertOctagon,  label: 'Danger',  bg: 'bg-bg-danger-subtle',  fg: 'text-text-danger'  },
};

interface Props {
  type?: CalloutType;
  children: ReactNode;
}

export function Callout({ type = 'note', children }: Props) {
  const { icon: Icon, label, bg, fg } = config[type];
  return (
    <aside
      role="note"
      className={`my-6 rounded-xl border border-border-subtle p-4 ${bg}`}
    >
      <div className="flex items-start gap-3">
        <Icon size={18} aria-hidden className={`mt-0.5 shrink-0 ${fg}`} />
        <div className="flex-1">
          <div className={`mb-1 text-sm font-semibold ${fg}`}>{label}</div>
          <div className="text-base text-text-primary">{children}</div>
        </div>
      </div>
    </aside>
  );
}
