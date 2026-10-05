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
const dynamicCandidates = [];

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('style={{') || line.includes('style={')) {
      // Check if it references variables, ternaries, template literals
      if (line.match(/\$\{|\?|&&|var\(|Math\./)) {
        dynamicCandidates.push({ file: f, line: idx + 1, content: line.trim() });
      }
    }
  });
});

console.log('Dynamic candidates found:', dynamicCandidates.length);
dynamicCandidates.forEach(c => {
  console.log(`${c.file}:${c.line} -> ${c.content}`);
});
