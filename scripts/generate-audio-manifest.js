const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const audioDir = path.join(projectRoot, 'public', 'audio');
const manifestPath = path.join(audioDir, 'manifest.json');
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

  fs.writeFileSync(manifestPath, JSON.stringify(tracks, null, 2) + '\n', 'utf8');
  console.log(`[audio-manifest] updated ${tracks.length} tracks`);
};

generateManifest();

if (watchMode) {
  console.log('[audio-manifest] watch mode enabled');
  let debounceTimer = null;

  fs.watch(audioDir, () => {
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
