import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CodeBlock } from '../CodeBlock';

describe('CodeBlock', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  test('renders code, language badge, copy button', () => {
    render(<CodeBlock language="typescript">{`const x = 1;`}</CodeBlock>);
    expect(screen.getByText('const x = 1;')).toBeInTheDocument();
    // language badge uppercase
    expect(screen.getByText(/typescript/i)).toBeInTheDocument();
    // copy button has accessible name
    expect(screen.getByRole('button', { name: /copy code/i })).toBeInTheDocument();
  });

  test('renders optional filename', () => {
    render(
      <CodeBlock language="bash" filename="scripts/deploy.sh">
        {`echo hi`}
      </CodeBlock>,
    );
    expect(screen.getByText('scripts/deploy.sh')).toBeInTheDocument();
  });

  test('clicking copy writes to clipboard with the source', async () => {
    render(<CodeBlock language="bash">{`echo hello world`}</CodeBlock>);
    fireEvent.click(screen.getByRole('button', { name: /copy code/i }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('echo hello world');
  });

  test('button shows "Copied" briefly after click, then reverts', async () => {
    vi.useFakeTimers();
    render(<CodeBlock language="bash">{`echo hi`}</CodeBlock>);
    fireEvent.click(screen.getByRole('button', { name: /copy code/i }));
    await waitFor(() => expect(screen.getByText(/copied/i)).toBeInTheDocument());
    vi.advanceTimersByTime(1600);
    await waitFor(() => expect(screen.queryByText(/copied/i)).not.toBeInTheDocument());
    vi.useRealTimers();
  });
});
