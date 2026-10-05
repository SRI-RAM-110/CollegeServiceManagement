import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(full));
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      results.push(full);
    }
  });
  return results;
}

const files = walk('frontend/src');
let total = 0;
const counts = {};

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const matches = content.match(/style\s*=\s*\{/g);
  if (matches) {
    counts[f] = matches.length;
    total += matches.length;
  }
});

console.log('Total inline styles found:', total);
console.log('Counts per file:');
Object.entries(counts).sort((a,b) => b[1] - a[1]).forEach(([k,v]) => {
  console.log(`  ${v.toString().padStart(3, ' ')} : ${k}`);
});
