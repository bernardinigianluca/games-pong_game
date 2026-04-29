const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const audioDir = path.join(projectRoot, 'public', 'audio');
const manifestPath = path.join(audioDir, 'manifest.json');
const manifestFileName = path.basename(manifestPath);
const watchMode = process.argv.includes('--watch');

const toLabel = (fileName) => fileName.replace(/\.[^.]+$/, '').trim();

const generateManifest = () => {
  if (!fs.existsSync(audioDir)) {
    console.warn('[audio-manifest] audio directory not found:', audioDir);
    return;
  }

  const tracks = fs
    .readdirSync(audioDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /\.mp3$/i.test(name))
    .sort((a, b) => a.localeCompare(b))
    .map((file) => ({ file, label: toLabel(file) }));

  const nextContent = JSON.stringify(tracks, null, 2) + '\n';
  const prevContent = fs.existsSync(manifestPath)
    ? fs.readFileSync(manifestPath, 'utf8')
    : null;

  if (prevContent === nextContent) {
    return;
  }

  fs.writeFileSync(manifestPath, nextContent, 'utf8');
  console.log(`[audio-manifest] updated ${tracks.length} tracks`);
};

generateManifest();

if (watchMode) {
  console.log('[audio-manifest] watch mode enabled');
  let debounceTimer = null;

  fs.watch(audioDir, (_eventType, fileName) => {
    if (typeof fileName === 'string' && fileName.toLowerCase() === manifestFileName.toLowerCase()) {
      return;
    }
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      try {
        generateManifest();
      } catch (err) {
        console.error('[audio-manifest] generation failed:', err.message);
      }
    }, 150);
  });
}
