const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const audioDir = path.join(projectRoot, 'public', 'audio');
const avatarDir = path.join(projectRoot, 'public', 'avatars');
const watchMode = process.argv.includes('--watch');

const toLabel = (fileName) => fileName.replace(/\.[^.]+$/, '').trim();
const isAvatarFile = (name) => /\.(png|jpe?g|webp|gif|svg)$/i.test(name);

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const writeManifestIfChanged = (manifestPath, items, scope) => {
  const nextContent = JSON.stringify(items, null, 2) + '\n';
  const prevContent = fs.existsSync(manifestPath)
    ? fs.readFileSync(manifestPath, 'utf8')
    : null;

  if (prevContent === nextContent) {
    return;
  }

  fs.writeFileSync(manifestPath, nextContent, 'utf8');
  console.log(`[${scope}-manifest] updated ${items.length} entries`);
};

const generateAudioManifest = () => {
  ensureDir(audioDir);
  const manifestPath = path.join(audioDir, 'manifest.json');

  const tracks = fs
    .readdirSync(audioDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /\.mp3$/i.test(name))
    .sort((a, b) => a.localeCompare(b))
    .map((file) => ({ file, label: toLabel(file) }));

  writeManifestIfChanged(manifestPath, tracks, 'audio');
};

const generateAvatarManifest = () => {
  ensureDir(avatarDir);
  const manifestPath = path.join(avatarDir, 'manifest.json');

  const avatars = fs
    .readdirSync(avatarDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.toLowerCase() !== 'manifest.json')
    .filter((name) => isAvatarFile(name))
    .sort((a, b) => a.localeCompare(b))
    .map((file) => ({ file, label: toLabel(file) }));

  writeManifestIfChanged(manifestPath, avatars, 'avatar');
};

const generateAllManifests = () => {
  generateAudioManifest();
  generateAvatarManifest();
};

generateAllManifests();

if (watchMode) {
  console.log('[asset-manifest] watch mode enabled');
  const watchDir = (dirPath, scope) => {
    const manifestFileName = 'manifest.json';
    let debounceTimer = null;

    fs.watch(dirPath, (_eventType, fileName) => {
      if (typeof fileName === 'string' && fileName.toLowerCase() === manifestFileName) {
        return;
      }
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        try {
          generateAllManifests();
        } catch (err) {
          console.error(`[${scope}-manifest] generation failed:`, err.message);
        }
      }, 150);
    });
  };

  watchDir(audioDir, 'audio');
  watchDir(avatarDir, 'avatar');
}
