import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"],
  testMatch: ["**/*.test.tsx"],
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/main.tsx"]
};

export default config;
