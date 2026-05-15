const fs = require('fs');
const content = fs.readFileSync('teamweb/src/cfg.js', 'utf8');
const skillcfgMatch = content.match(/export const skillcfg = `(\{[\s\S]*?\})`/);
if (skillcfgMatch) {
  fs.writeFileSync('miniprogram/utils/skillcfg.js', 'module.exports = ' + skillcfgMatch[1] + ';');
  console.log("skillcfg.js extracted");
}
