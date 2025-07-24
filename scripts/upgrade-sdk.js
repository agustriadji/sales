const { exec } = require('child_process');
const pkgJson = require('../package.json');
const packages = Object.keys(pkgJson.dependencies);
const sdks = packages.filter((pkg) => pkg.startsWith('@wings-corporation'));

exec(`yarn add ${sdks.join(' ')}`, (err, stdout, stderr) => {
  if (err) {
    throw err;
  }
  console.log(stdout);
  console.log(stderr);
});
