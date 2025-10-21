import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { ensurePaths, paths } from '../config.js';

const main = async () => {
  ensurePaths();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archivePath = path.join(paths.backups, `guns-backup-${timestamp}.tar.gz`);

  await fs.mkdir(paths.backups, { recursive: true });

  await new Promise((resolve, reject) => {
    const tar = spawn('tar', ['-czf', archivePath, '-C', paths.root, '.']);
    tar.on('error', reject);
    tar.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`tar exited with code ${code}`));
    });
  });

  console.log(`Backup created at ${archivePath}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
