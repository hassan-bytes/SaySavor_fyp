const fs = require('fs');
const text = fs.readFileSync('src/2_partner/dashboard/pages/MenuManager.tsx', 'utf8');
let lineNum = 1;
let out = [];
for(let i=0; i<text.length; i++) {
  if (text[i]==='\n') lineNum++;
  if (text[i]==='<' && /[a-zA-Z\/]/.test(text[i+1])) {
    let j = i+1;
    let isClose = false;
    if (text[j]==='/') { isClose=true; j++; }
    let start = j;
    while(j<text.length && /[a-zA-Z0-9_-]/.test(text[j])) j++;
    let tagName = text.substring(start, j);
    let k = j;
    while(k<text.length && text[k]!=='>') k++;
    let m = k-1;
    while(m>j && text[m]===' ') m--;
    let selfClose = text[m]==='/';
    
    if (!['br','img','input','hr','path','commanditem','switch','creatableselect','textarea','dealbuilder','variantmanager','modifiermanager','button','label'].includes(tagName.toLowerCase()) && !selfClose) {
       out.push({tag: tagName, type: isClose?'close':'open', line: lineNum});
    }
  }
}

let stack = [];
for(let t of out) {
  if (t.line < 2740 || t.line > 3510) continue; 
  if (t.type === 'open') stack.push(t);
  else {
      if(stack.length && stack[stack.length-1].tag === t.tag) { stack.pop(); }
      else {
          let idx = stack.map(s=>s.tag).lastIndexOf(t.tag);
          if (idx !== -1) { 
              console.log('Popping to match', t.tag, 'at line', t.line, 'discarded elements opened at lines:', stack.slice(idx+1).map(s=>s.line).join(', '));
              stack.splice(idx, stack.length-idx); 
          } else {
              console.log('Ignored unmatched close', t.tag, 'at line', t.line);
          }
      }
  }
}
