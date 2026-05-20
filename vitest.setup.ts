import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Shim `jest` global so @testing-library/dom's waitFor detects vi fake timers.
// RTL only checks `typeof jest !== 'undefined'` to enable fake-timer-aware polling.
// See: node_modules/@testing-library/dom/dist/helpers.js (jestFakeTimersAreEnabled).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).jest = vi;
