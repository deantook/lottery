const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, 'prizes.json');
const outPath = path.join(__dirname, 'prizes.config.js');

const config = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const content = [
  '// 由 build-config.js 根据 prizes.json 自动生成，请勿直接编辑',
  '// 修改奖品后运行: node build-config.js',
  `window.PRIZES_CONFIG = ${JSON.stringify(config, null, 2)};`,
  '',
].join('\n');

fs.writeFileSync(outPath, content, 'utf8');
console.log('已生成 prizes.config.js');
