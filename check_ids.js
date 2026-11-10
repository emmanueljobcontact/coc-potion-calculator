const fs = require('fs');

const code = fs.readFileSync('app.js', 'utf8');
const idRegex = /document\.getElementById\(['"]([^'"]+)['"]\)/g;
let match;
const ids = new Set();
while ((match = idRegex.exec(code)) !== null) {
    ids.add(match[1]);
}
console.log('App.js checks IDs count:', ids.size);
const html = fs.readFileSync('index.html', 'utf8');
let missingCount = 0;
for (const id of ids) {
    if (!html.includes(`id="${id}"`) && !html.includes(`id='${id}'`)) {
        console.error('❌ MISSING ID IN HTML:', id);
        missingCount++;
    }
}
if (missingCount === 0) {
    console.log('✅ All', ids.size, 'IDs exist in index.html!');
}
