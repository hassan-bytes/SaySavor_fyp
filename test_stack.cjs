const fs = require('fs');
const text = fs.readFileSync('src/2_partner/dashboard/pages/MenuManager.tsx', 'utf8');
const lines = text.split('\n');

let stack = [];
for (let i = 2824; i <= 3163; i++) {
  const line = lines[i];
  if (line === undefined) break;

  const openRegex = /<([a-zA-Z0-9_-]+)([^>]*?)(?<!\/)>/g;
  const matchOpen = line.matchAll(openRegex);
  for (const m of matchOpen) {
      if (!['br', 'img', 'input', 'hr', 'path', 'commanditem'].includes(m[1].toLowerCase()) && !m[0].endsWith('/>')) {
          stack.push({tag: m[1], line: i + 1});
      }
  }
  
  const closeRegex = /<\/([a-zA-Z0-9_-]+)>/g;
  const matchClose = line.matchAll(closeRegex);
  for (const m of matchClose) {
      if(stack.length && stack[stack.length - 1].tag === m[1]) {
          stack.pop();
      } else {
          // ignore mismatch for now, or pop until found
          const idx = stack.map(s => s.tag).lastIndexOf(m[1]);
          if (idx !== -1) {
             stack.splice(idx, stack.length - idx);
          }
      }
  }
  
  if (i === 3160 || i === 3161 || i === 3162) {
      console.log('--- At end of line', i+1, '---');
      stack.forEach(s => console.log('  Line', s.line, '<' + s.tag + '>'));
  }
}
