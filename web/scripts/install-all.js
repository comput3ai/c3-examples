const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const webDir = path.join(__dirname, '..');

// Get all subdirectories that contain package.json
const getExampleDirs = () => {
  return fs.readdirSync(webDir)
    .filter(dir => {
      if (dir === 'node_modules' || dir === 'scripts' || dir === 'dist') return false;
      const dirPath = path.join(webDir, dir);
      return fs.statSync(dirPath).isDirectory() && 
             fs.existsSync(path.join(dirPath, 'package.json'));
    });
};

console.log('📦 Installing dependencies for all examples...\n');

const examples = getExampleDirs();

if (examples.length === 0) {
  console.log('No example projects found.');
  process.exit(0);
}

examples.forEach(example => {
  console.log(`📦 Installing dependencies for ${example}...`);
  const examplePath = path.join(webDir, example);
  
  try {
    execSync('npm install', { cwd: examplePath, stdio: 'inherit' });
    console.log(`✅ ${example} dependencies installed!\n`);
  } catch (error) {
    console.error(`❌ Failed to install dependencies for ${example}:`, error.message);
    process.exit(1);
  }
});

console.log('✨ All dependencies installed successfully!');