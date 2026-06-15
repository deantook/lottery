const fs = require('fs');
const config = JSON.parse(fs.readFileSync('prizes.json', 'utf8'));
const body = JSON.stringify(config, null, 2);
fs.writeFileSync('prizes.config.js', `window.PRIZES_CONFIG = ${body};\n`);
