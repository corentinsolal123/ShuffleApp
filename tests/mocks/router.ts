import { vi } from "vitest";

/** Shared `useRouter()` mock, reset after each test by the integration setup. */
export const routerMock = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
};
