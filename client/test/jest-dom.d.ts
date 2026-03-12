import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

declare global {
  namespace Vi {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface Assertion<T = unknown> extends TestingLibraryMatchers<T, void> {}
  }
}