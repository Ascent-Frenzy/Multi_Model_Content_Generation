import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@app/types$': '<rootDir>/../../packages/types/src/index.ts',
    '^@app/constants$': '<rootDir>/../../packages/constants/src/index.ts',
    '^@app/dtos$': '<rootDir>/../../packages/dtos/src/index.ts',
    '^@app/utils$': '<rootDir>/../../packages/utils/src/index.ts',
  },
};

export default config;
