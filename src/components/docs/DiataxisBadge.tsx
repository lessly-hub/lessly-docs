type DiataxisType = 'tutorial' | 'how-to' | 'explanation' | 'reference';

const labels: Record<DiataxisType, string> = {
  tutorial:    'Tutorial',
  'how-to':    'How-to',
  explanation: 'Explanation',
  reference:   'Reference',
};

export function DiataxisBadge({ type }: { type: DiataxisType }) {
  return (
    <span className="inline-flex items-center rounded-full bg-bg-brand-subtle px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-text-brand">
      {labels[type]}
    </span>
  );
}
