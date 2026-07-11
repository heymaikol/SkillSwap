module.exports = {
  moduleFileExtensions: ["js", "json", "vue"],
  transform: {
    "^.+\\.vue$": "@vue/vue3-jest",
    "^.+\\.js$": "babel-jest",
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    // More specific SVG file mock pattern
    "\\.(svg)$": "<rootDir>/tests/mocks/svgMock.js",
    // Also mock CSS imports
    "\\.(css|less)$": "<rootDir>/tests/mocks/styleMock.js",
  },
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
};
