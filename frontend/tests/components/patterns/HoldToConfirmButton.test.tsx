import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import HoldToConfirmButton from '@/components/patterns/HoldToConfirmButton';

const HOLD_MS = 1_000;

function renderButton() {
  const onConfirm = vi.fn();
  render(<HoldToConfirmButton label="Hold to remove" holdMs={HOLD_MS} onConfirm={onConfirm} />);
  return { onConfirm, button: screen.getByRole('button', { name: /Hold to remove/ }) };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('HoldToConfirmButton', () => {
  it('never fires on a plain click', () => {
    const { onConfirm, button } = renderButton();
    fireEvent.click(button);
    act(() => { vi.advanceTimersByTime(HOLD_MS * 2); });
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('fires once the button has been held for the whole time', () => {
    const { onConfirm, button } = renderButton();
    fireEvent.pointerDown(button);
    act(() => { vi.advanceTimersByTime(HOLD_MS + 50); });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('cancels when the button is let go early', () => {
    const { onConfirm, button } = renderButton();
    fireEvent.pointerDown(button);
    act(() => { vi.advanceTimersByTime(HOLD_MS / 2); });
    fireEvent.pointerUp(button);
    act(() => { vi.advanceTimersByTime(HOLD_MS); });
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('works from the keyboard by holding Space', () => {
    const { onConfirm, button } = renderButton();
    fireEvent.keyDown(button, { key: ' ' });
    act(() => { vi.advanceTimersByTime(HOLD_MS + 50); });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
