import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FeedbackWidget } from '../FeedbackWidget';

vi.mock('posthog-js', () => ({
  default: { capture: vi.fn() },
}));

describe('FeedbackWidget', () => {
  beforeEach(async () => {
    const posthog = (await import('posthog-js')).default;
    (posthog.capture as ReturnType<typeof vi.fn>).mockClear();
  });

  test('renders thumbs-up and thumbs-down buttons', () => {
    render(<FeedbackWidget path="/test" />);
    expect(screen.getByRole('button', { name: /^helpful$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /not helpful/i })).toBeInTheDocument();
  });

  test('captures docs.feedback.submitted with value=up on thumbs-up', async () => {
    const posthog = (await import('posthog-js')).default;
    render(<FeedbackWidget path="/x" />);
    fireEvent.click(screen.getByRole('button', { name: /^helpful$/i }));
    expect(posthog.capture).toHaveBeenCalledWith('docs.feedback.submitted', {
      path: '/x',
      value: 'up',
    });
  });

  test('captures docs.feedback.submitted with value=down on thumbs-down', async () => {
    const posthog = (await import('posthog-js')).default;
    render(<FeedbackWidget path="/y" />);
    fireEvent.click(screen.getByRole('button', { name: /not helpful/i }));
    expect(posthog.capture).toHaveBeenCalledWith('docs.feedback.submitted', {
      path: '/y',
      value: 'down',
    });
  });

  test('shows "Thanks, recorded." after submit (UX rule 3.1 designed success state)', () => {
    render(<FeedbackWidget path="/x" />);
    fireEvent.click(screen.getByRole('button', { name: /^helpful$/i }));
    expect(screen.getByText(/thanks, recorded/i)).toBeInTheDocument();
  });

  test('after submit, the buttons are no longer rendered', () => {
    render(<FeedbackWidget path="/x" />);
    fireEvent.click(screen.getByRole('button', { name: /^helpful$/i }));
    expect(screen.queryByRole('button', { name: /helpful/i })).not.toBeInTheDocument();
  });
});
