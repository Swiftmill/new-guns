import path from 'path';
import fs from 'fs/promises';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { defaults, paths, roles } from '../config.js';
import { readJson, writeJson, listFiles, fileExists } from './fileStorage.js';

const USERS_DIR = paths.users;

const buildUserPath = (username) => path.join(USERS_DIR, `${username}.json`);

export const getUser = async (username) => {
  return readJson(buildUserPath(username));
};

export const getAllUsers = async () => {
  const files = await listFiles(USERS_DIR);
  const users = [];
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const data = await readJson(path.join(USERS_DIR, file));
    if (data) users.push(data);
  }
  return users;
};

export const createUser = async ({
  username,
  password,
  displayName,
  role = roles.user,
  description = '',
  badges = [],
  socials = [],
  media = {},
  settings = {}
}) => {
  const userPath = buildUserPath(username);
  if (await fileExists(userPath)) {
    throw new Error('Username already exists');
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const userData = {
    id: nanoid(),
    username,
    displayName: displayName || username,
    description,
    role,
    badges,
    socials,
    media,
    settings: {
      theme: { ...defaults.theme, ...(settings.theme || {}) },
      layout: settings.layout || 'default'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await writeJson(userPath, { ...userData, passwordHash });
  const { passwordHash: _, ...publicUser } = userData;
  return publicUser;
};

export const updateUser = async (username, payload) => {
  const userPath = buildUserPath(username);
  const existing = await readJson(userPath);
  if (!existing) throw new Error('User not found');
  const updated = {
    ...existing,
    ...payload,
    updatedAt: new Date().toISOString()
  };
  await writeJson(userPath, updated);
  return sanitizeUser(updated);
};

export const deleteUser = async (username) => {
  const userPath = buildUserPath(username);
  if (!(await fileExists(userPath))) return;
  await fs.unlink(userPath);
  const uploadDir = path.join(paths.uploads, username);
  try {
    await fs.rm(uploadDir, { recursive: true, force: true });
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
};

export const authenticate = async (username, password) => {
  const record = await readJson(buildUserPath(username));
  if (!record) return null;
  const match = await bcrypt.compare(password, record.passwordHash || '');
  if (!match) return null;
  return sanitizeUser(record);
};

export const sanitizeUser = (user) => {
  const { passwordHash, ...rest } = user;
  return rest;
};

export const ensureAdminAccount = async () => {
  const adminPath = buildUserPath('admin');
  if (!(await fileExists(adminPath))) {
    await createUser({
      username: 'admin',
      password: 'admin123',
      displayName: 'Administrator',
      role: roles.admin,
      description: 'Default admin user'
    });
  }
};
