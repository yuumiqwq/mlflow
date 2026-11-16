// Compile the checked-in React Intl catalogs for both development and release builds.
const fs = require('fs');
const path = require('path');
const { compile } = require('@formatjs/cli');

async function main() {
  const directory = path.resolve(__dirname, '../src/lang');
  fs.mkdirSync(path.join(directory, 'compiled'), { recursive: true });
  for (const filename of fs.readdirSync(directory).filter((name) => name.endsWith('.json'))) {
    const messages = await compile([path.join(directory, filename)], { ast: true });
    fs.writeFileSync(path.join(directory, 'compiled', filename), messages);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
