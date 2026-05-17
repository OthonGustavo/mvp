const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const footerRegex = /<footer class="bg-gray-900[\s\S]*?<\/footer>/g;
const scriptRegex = /<script src="footer\.js"><\/script>/g;

let replacedCount = 0;

for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Avoid double inclusion if script already exists
    const replacement = content.includes('<script src="footer.js"></script>') 
        ? '<app-footer></app-footer>' 
        : '<app-footer></app-footer>\n    <script src="footer.js"></script>';
        
    if (footerRegex.test(content)) {
        content = content.replace(footerRegex, replacement);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Replaced in ${file}`);
        replacedCount++;
    }
}
console.log(`Total files updated: ${replacedCount}`);
