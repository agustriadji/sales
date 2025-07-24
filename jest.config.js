/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');

function getRelativePathFromRoot() {
  const root = path.resolve(__dirname);
  const currentPackageDir = process.cwd();
  return path.relative(root, currentPackageDir);
}

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['@swc/jest'],
  },
  collectCoverageFrom: ['**/*.ts'],
  coverageReporters: ['html', 'text', 'text-summary', 'cobertura'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@wings-online/(.*)$': '<rootDir>/$1',
    '^@stubs/(.*)$': '<rootDir>/../test/stubs/$1',
  },
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputName: 'jest-junit.xml',
        ancestorSeparator: ' > ',
        suiteNameTemplate: `{filepath}`,
        classNameTemplate: `{filepath}`,
        filePathPrefix: getRelativePathFromRoot(),
        addFileAttribute: 'true',
      },
    ],
  ],
  setupFiles: ['<rootDir>/../test/setup.ts'],
};
