import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const dataRoot = process.env.GUNS_DATA_ROOT || '/data/guns';

export const paths = {
  root: dataRoot,
  users: path.join(dataRoot, 'users'),
  uploads: path.join(dataRoot, 'uploads'),
  sessions: path.join(dataRoot, 'sessions'),
  backups: path.join(dataRoot, 'backups')
};

export const serverConfig = {
  sessionSecret: process.env.SESSION_SECRET || 'guns-dev-secret',
  port: process.env.PORT || 3000,
  csrfDisabled: process.env.DISABLE_CSRF === 'true'
};

export const limits = {
  maxVideoSize: 100 * 1024 * 1024,
  maxImageSize: 10 * 1024 * 1024,
  maxAudioSize: 20 * 1024 * 1024
};

export const defaults = {
  theme: {
    accentColor: '#8f5afc',
    textColor: '#ffffff',
    backgroundColor: '#1b102b',
    blur: 18,
    opacity: 0.9
  },
  badges: ['verified', 'creator', 'sponsor']
};

export const roles = {
  admin: 'admin',
  user: 'user'
};

export const ensurePaths = () => {
  [paths.root, paths.users, paths.uploads, paths.sessions, paths.backups].forEach((p) => {
    if (!fs.existsSync(p)) {
      fs.mkdirSync(p, { recursive: true });
    }
  });
};
