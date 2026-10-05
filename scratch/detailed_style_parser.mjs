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

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const regex = /style\s*=\s*\{\{([\s\S]*?)\}\}/g;
  let match;
  let count = 0;
  let dynamicCount = 0;
  
  while ((match = regex.exec(content)) !== null) {
    count++;
    const body = match[1];
    // Check if body contains dynamic expressions (ternary ?, template literal `${`, function call, etc.)
    if (body.includes('?') || body.includes('${') || body.includes('Math.') || body.includes('===') || body.includes('item.') || body.includes('d.')) {
      dynamicCount++;
    }
  }
  if (count > 0) {
    console.log(`${f}: Total = ${count}, Potentially dynamic = ${dynamicCount}, Static = ${count - dynamicCount}`);
  }
});
