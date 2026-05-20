'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

interface Props {
  language: string;
  filename?: string;
  children: string;
}

export function CodeBlock({ language, filename, children }: Props) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="my-6 overflow-hidden rounded-xl border border-border-subtle bg-bg-sunken">
      <div className="flex items-center justify-between border-b border-border-subtle bg-bg-surface px-4 py-2 text-xs">
        <div className="flex items-center gap-3 font-mono uppercase tracking-wide text-text-tertiary">
          {filename && (
            <span className="normal-case text-text-secondary">{filename}</span>
          )}
          <span>{language}</span>
        </div>
        <button
          type="button"
          onClick={onCopy}
          aria-label="Copy code"
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-text-tertiary transition-colors hover:bg-bg-elevated hover:text-text-primary"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-sm text-text-primary">
        <code>{children}</code>
      </pre>
    </div>
  );
}
