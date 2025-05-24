const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const webDir = path.join(__dirname, '..');
const distDir = path.join(webDir, 'dist');

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

console.log('🚀 Building all examples...\n');

const examples = getExampleDirs();

if (examples.length === 0) {
  console.log('No example projects found to build.');
  process.exit(0);
}

// Build each example
examples.forEach(example => {
  console.log(`📦 Building ${example}...`);
  const examplePath = path.join(webDir, example);
  
  try {
    // Install dependencies if needed
    if (!fs.existsSync(path.join(examplePath, 'node_modules'))) {
      console.log(`  Installing dependencies...`);
      execSync('npm install', { cwd: examplePath, stdio: 'inherit' });
    }
    
    // Build the project
    execSync('npm run build', { cwd: examplePath, stdio: 'inherit' });
    
    // Copy the built files to the main dist directory
    const exampleDist = path.join(examplePath, 'dist');
    const targetDir = path.join(distDir, example);
    
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // Copy built files
    execSync(`cp -r ${exampleDist}/* ${targetDir}/`, { stdio: 'inherit' });
    
    console.log(`✅ ${example} built successfully!\n`);
  } catch (error) {
    console.error(`❌ Failed to build ${example}:`, error.message);
    process.exit(1);
  }
});

// Update the index.html with actual examples
updateIndexWithExamples(examples);

console.log('✨ All examples built successfully!');

function updateIndexWithExamples(examples) {
  const indexPath = path.join(distDir, 'index.html');
  let indexContent = fs.readFileSync(indexPath, 'utf-8');
  
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
  
  // Replace the examples array in the script
  const scriptRegex = /const examples = \[[^\]]*\];/;
  const newExamplesScript = `const examples = ${JSON.stringify(examplesData, null, 2)};`;
  indexContent = indexContent.replace(scriptRegex, newExamplesScript);
  
  fs.writeFileSync(indexPath, indexContent);
}