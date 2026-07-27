import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ResumeDownloadsBanner from '../ResumeDownloadsBanner';

describe('ResumeDownloadsBanner', () => {
  it('renders nothing when there are no resumable downloads', () => {
    const { container } = render(<ResumeDownloadsBanner items={[]} onResume={vi.fn()} onDismiss={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('shows singular copy and the title for one interrupted download', () => {
    render(
      <ResumeDownloadsBanner
        items={[{ id: 'a1', url: 'https://youtu.be/x', title: 'My Video' }]}
        onResume={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );
    expect(screen.getByText('Resume interrupted download?')).toBeTruthy();
    expect(screen.getByText('My Video')).toBeTruthy();
  });

  it('shows plural copy and falls back to the URL when no title is known yet', () => {
    render(
      <ResumeDownloadsBanner
        items={[
          { id: 'a1', url: 'https://youtu.be/x', title: '' },
          { id: 'a2', url: 'https://youtu.be/y', title: '' },
        ]}
        onResume={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );
    expect(screen.getByText('Resume 2 interrupted downloads?')).toBeTruthy();
    expect(screen.getByText('https://youtu.be/x')).toBeTruthy();
    expect(screen.getByText('https://youtu.be/y')).toBeTruthy();
  });

  it('calls onResume with the clicked item', () => {
    const onResume = vi.fn();
    const item = { id: 'a1', url: 'https://youtu.be/x', title: 'My Video' };
    render(<ResumeDownloadsBanner items={[item]} onResume={onResume} onDismiss={vi.fn()} />);

    // Two buttons per row: Resume (first), then the icon-only dismiss button.
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(onResume).toHaveBeenCalledWith(item);
  });

  it('calls onDismiss with the clicked item', () => {
    const onDismiss = vi.fn();
    const item = { id: 'a1', url: 'https://youtu.be/x', title: 'My Video' };
    render(<ResumeDownloadsBanner items={[item]} onResume={vi.fn()} onDismiss={onDismiss} />);

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);
    expect(onDismiss).toHaveBeenCalledWith(item);
  });
});
