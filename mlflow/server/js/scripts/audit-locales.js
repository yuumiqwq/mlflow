// Audit current source IDs and ICU contracts, excluding obsolete translation IDs from coverage.
const fs = require('fs');
const path = require('path');
const { parse } = require('@formatjs/icu-messageformat-parser');
const directory = path.resolve(__dirname, '../src/lang');
const source = JSON.parse(fs.readFileSync(path.join(directory, 'default/en.json'), 'utf8'));
const translated = JSON.parse(fs.readFileSync(path.join(directory, 'zh-CN.json'), 'utf8'));

function contract(message) {
  const args = new Set();
  const visit = (nodes) => {
    for (const node of nodes) {
      if (node.type > 0 && node.type !== 7) args.add(`${node.type === 8 ? 'tag' : 'argument'}:${node.value}`);
      if (node.type === 2 || node.type === 6) args.add(`number:${node.value}`);
      if (node.type === 3) args.add(`date:${node.value}`);
      if (node.type === 4) args.add(`time:${node.value}`);
      if (node.type === 5) args.add(`select:${node.value}:${Object.keys(node.options).sort().join(',')}`);
      if (node.options) Object.values(node.options).forEach((option) => visit(option.value));
      if (node.children) visit(node.children);
    }
  };
  visit(parse(message));
  return [...args].sort();
}

const missing = [];
const invalid = [];
const unchanged = [];
for (const [id, message] of Object.entries(source)) {
  if (!translated[id]) { missing.push(id); continue; }
  const text = translated[id].defaultMessage;
  try {
    if (JSON.stringify(contract(message.defaultMessage)) !== JSON.stringify(contract(text))) {
      invalid.push({ id, source: contract(message.defaultMessage), translation: contract(text) });
    }
  } catch (error) { invalid.push({ id, error: String(error) }); }
  if (text === message.defaultMessage) unchanged.push({ id, text });
}
const report = {
  total: Object.keys(source).length,
  covered: Object.keys(source).length - missing.length,
  missing,
  invalid,
  unchanged,
  obsolete: Object.keys(translated).filter((id) => !source[id]).length,
};
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, unchanged: unchanged.length }, null, 2));
if (missing.length || invalid.length) process.exitCode = 1;
