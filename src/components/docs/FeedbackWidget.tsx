'use client';

import { ThumbsDown, ThumbsUp } from 'lucide-react';
import posthog from 'posthog-js';
import { useState } from 'react';

interface Props {
  path: string;
}

export function FeedbackWidget({ path }: Props) {
  const [submitted, setSubmitted] = useState<'up' | 'down' | null>(null);

  const onClick = (value: 'up' | 'down') => {
    posthog.capture('docs.feedback.submitted', { path, value });
    setSubmitted(value);
  };

  if (submitted) {
    return (
      <div className="mt-12 border-t border-border-subtle pt-6 text-sm text-text-tertiary">
        Thanks, recorded.
      </div>
    );
  }

  return (
    <div className="mt-12 flex items-center gap-4 border-t border-border-subtle pt-6">
      <span className="text-sm text-text-secondary">Was this page helpful?</span>
      <button
        type="button"
        onClick={() => onClick('up')}
        aria-label="Helpful"
        className="rounded-md p-2 text-text-tertiary transition-colors hover:bg-bg-surface hover:text-text-success"
      >
        <ThumbsUp size={16} />
      </button>
      <button
        type="button"
        onClick={() => onClick('down')}
        aria-label="Not helpful"
        className="rounded-md p-2 text-text-tertiary transition-colors hover:bg-bg-surface hover:text-text-danger"
      >
        <ThumbsDown size={16} />
      </button>
    </div>
  );
}
