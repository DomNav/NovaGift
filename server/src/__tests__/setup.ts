import { expect } from "vitest";

declare global {
  namespace Vi {
    interface Assertion {
      toBeOneOf(list: any[]): void;
    }
  }
}

expect.extend({
  toBeOneOf(received, list) {
    const pass = list.includes(received);
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be one of ${JSON.stringify(list)}`
          : `expected ${received} to be one of ${JSON.stringify(list)}`
    };
  }
});