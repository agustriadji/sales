module.exports = {
  '**/*.ts': () => ['yarn tsc', 'yarn test --silent'],
  '**/*.{js,ts,json,md}': (filenames) =>
    filenames.length > 10
      ? 'yarn format'
      : `prettier ${filenames.join(' ')} --write`,
  '**/*.ts': (filenames) =>
    filenames.length > 10 ? `yarn lint` : `eslint ${filenames.join(' ')} --fix`,
};
