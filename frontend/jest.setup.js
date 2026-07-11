import { config } from "@vue/test-utils";
config.global.stubs["font-awesome-icon"] = true;

// Mock SVG imports globally
jest.mock("@/assets/images/skill-sharing.svg", () => "mock-svg", {
  virtual: true,
});

// Suppress noisy console warnings/errors globally during tests
// You can selectively restore them in specific test files if needed
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args) => {
  // You can add conditions to allow specific error messages to show
  // For example, you could check if the error contains "Vue" or "Test"
  if (process.env.DEBUG) {
    originalConsoleError(...args);
  }
};

console.warn = (...args) => {
  // You can add conditions here too
  if (process.env.DEBUG) {
    originalConsoleWarn(...args);
  }
};

// Make sure to add the window.scrollTo mock here if it's not already present
window.scrollTo = jest.fn();
