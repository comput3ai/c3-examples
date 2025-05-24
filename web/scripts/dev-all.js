const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const webDir = path.join(__dirname, '..');
let port = 5174; // Start after the main index port (5173)

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

const examples = getExampleDirs();
const examplePorts = {};

console.log('🚀 Starting development servers...\n');

// Start each example on a different port
examples.forEach(example => {
  const examplePath = path.join(webDir, example);
  const examplePort = port++;
  examplePorts[example] = examplePort;
  
  console.log(`📦 Starting ${example} on port ${examplePort}...`);
  
  const child = spawn('npm', ['run', 'dev', '--', '--port', examplePort.toString()], {
    cwd: examplePath,
    stdio: 'inherit',
    shell: true
  });
  
  child.on('error', (err) => {
    console.error(`❌ Failed to start ${example}:`, err);
  });
});

// Update index.html with development ports
setTimeout(() => {
  const indexPath = path.join(webDir, 'index.html');
  let indexContent = fs.readFileSync(indexPath, 'utf-8');
  
  // Update paths to include ports for development
  Object.entries(examplePorts).forEach(([example, port]) => {
    const regex = new RegExp(`"path":\\s*"/${example}"`, 'g');
    indexContent = indexContent.replace(regex, `"path": "http://localhost:${port}"`);
  });
  
  fs.writeFileSync(indexPath, indexContent);
  console.log('\n✅ Development servers started! Index updated with dev URLs.');
  console.log('\n📝 Access the index at: http://localhost:5173');
}, 2000);