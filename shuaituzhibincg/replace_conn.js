const fs = require('fs');
const path = require('path');

const files = [
  'http/handle/api/handle.go',
  'http/handle/api/leaderboard.go',
  'http/handle/api/member.go'
];

files.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Add middleware import if not present
    if (!content.includes('"stzbHelper/middleware"')) {
        content = content.replace(/"stzbHelper\/model"/, '"stzbHelper/middleware"\n\t"stzbHelper/model"');
    }
    
    content = content.replace(/model\.Conn/g, 'middleware.GetDB(c)');
    
    // Fix any `if middleware.GetDB(c) == nil` to properly initialize db first if it's assigned to a variable,
    // actually just replacing model.Conn with middleware.GetDB(c) directly works since Gorm supports chaining.
    
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Replaced in ${file}`);
  } else {
    console.log(`File not found: ${fullPath}`);
  }
});
