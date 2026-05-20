type Status = 'stable' | 'beta' | 'preview';

const config: Record<Exclude<Status, 'stable'>, { label: string; tone: string }> = {
  beta:    { label: 'Beta',    tone: 'bg-bg-brand-subtle text-text-brand'     },
  preview: { label: 'Preview', tone: 'bg-bg-warning-subtle text-text-warning' },
};

export function PageStatus({ value }: { value: Status }) {
  if (value === 'stable') return null;
  const { label, tone } = config[value];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${tone}`}>
      {label}
    </span>
  );
}
