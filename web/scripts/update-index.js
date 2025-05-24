const fs = require('fs');
const path = require('path');

const webDir = path.join(__dirname, '..');

// Get all subdirectories that contain package.json (excluding node_modules and scripts)
const getExampleDirs = () => {
  return fs.readdirSync(webDir)
    .filter(dir => {
      if (dir === 'node_modules' || dir === 'scripts' || dir === 'dist') return false;
      const dirPath = path.join(webDir, dir);
      return fs.statSync(dirPath).isDirectory() && 
             fs.existsSync(path.join(dirPath, 'package.json'));
    });
};

console.log('📝 Updating index with examples...\n');

const examples = getExampleDirs();

// Generate examples data from package.json files
const examplesData = examples.map(example => {
  const pkgPath = path.join(webDir, example, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  return {
    title: pkg.displayName || example.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    description: pkg.description || 'A Comput3 example application',
    path: `/${example}`
  };
});

// Update the index.html
const indexPath = path.join(webDir, 'index.html');
let indexContent = fs.readFileSync(indexPath, 'utf-8');

// Replace the examples array in the script
const scriptRegex = /const examples = \[[^\]]*\];/s;
const newExamplesScript = `const examples = ${JSON.stringify(examplesData, null, 6).split('\n').map((line, i) => i === 0 ? line : '    ' + line).join('\n')};`;
indexContent = indexContent.replace(scriptRegex, newExamplesScript);

fs.writeFileSync(indexPath, indexContent);

if (examples.length > 0) {
  console.log('✅ Found and indexed examples:');
  examplesData.forEach(ex => console.log(`   - ${ex.title} at ${ex.path}`));
} else {
  console.log('ℹ️  No examples found yet. Create example directories with package.json files.');
}
console.log('\n✨ Index updated!');