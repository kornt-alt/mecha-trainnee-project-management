// Verifies that local-date updates fire at midnight and stop after unmount.
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import useLocalDay from './useLocalDay';

test('updates at local midnight and cleans up its timer', () => {
  const previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 10, 23, 23, 59, 59));
  const container = document.createElement('div');
  const root = createRoot(container);
  const days = [];
  function Probe() {
    const now = useLocalDay();
    days.push(now.getDate());
    return null;
  }

  try {
    act(() => root.render(<Probe />));
    expect(days.at(-1)).toBe(23);
    expect(jest.getTimerCount()).toBe(1);

    act(() => jest.advanceTimersByTime(1050));
    expect(days.at(-1)).toBe(24);
    expect(jest.getTimerCount()).toBe(1);

    act(() => root.unmount());
    expect(jest.getTimerCount()).toBe(0);
  } finally {
    jest.useRealTimers();
    globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  }
});
