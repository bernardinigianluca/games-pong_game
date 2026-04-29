const { spawn } = require('child_process');
const path = require('path');

const node = process.execPath;
const reactScriptsBin = require.resolve('react-scripts/bin/react-scripts.js');
const manifestScript = path.join(__dirname, 'generate-audio-manifest.js');

const manifestProc = spawn(node, [manifestScript, '--watch'], {
  stdio: 'inherit',
  cwd: path.resolve(__dirname, '..'),
});

const reactProc = spawn(node, [reactScriptsBin, 'start'], {
  stdio: 'inherit',
  cwd: path.resolve(__dirname, '..'),
  env: process.env,
});

const shutdown = () => {
  if (!manifestProc.killed) manifestProc.kill();
  if (!reactProc.killed) reactProc.kill();
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

reactProc.on('exit', (code) => {
  if (!manifestProc.killed) manifestProc.kill();
  process.exit(code ?? 0);
});

manifestProc.on('exit', (code) => {
  if (code && !reactProc.killed) {
    reactProc.kill();
    process.exit(code);
  }
});
