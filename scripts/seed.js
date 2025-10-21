import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { ensurePaths, paths } from '../config.js';
import { createUser, getUser } from '../lib/userService.js';

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = { count: 20 };
  args.forEach((arg) => {
    const [key, value] = arg.split('=');
    if (key === '--count' && value) {
      options.count = Number.parseInt(value, 10) || options.count;
    }
  });
  return options;
};

const adjectives = ['stellar', 'lunar', 'quantum', 'neon', 'crimson', 'midnight', 'cyber', 'ghost', 'velvet'];
const nouns = ['rogue', 'pilot', 'viper', 'nova', 'glitch', 'haze', 'pulse', 'spirit', 'vector'];

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

const createAvatar = async (username) => {
  const userDir = path.join(paths.uploads, username);
  await fs.mkdir(userDir, { recursive: true });
  const gradient = {
    left: Math.floor(Math.random() * 255),
    right: Math.floor(Math.random() * 255)
  };
  const buffer = await sharp({ create: { width: 512, height: 512, channels: 4, background: { r: gradient.left, g: 90, b: gradient.right, alpha: 1 } } })
    .png()
    .composite([
      {
        input: Buffer.from(
          `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg"><circle cx="256" cy="210" r="140" fill="rgba(255,255,255,0.82)"/><rect x="112" y="310" rx="96" ry="96" width="288" height="160" fill="rgba(255,255,255,0.4)"/></svg>`
        ),
        top: 0,
        left: 0
      }
    ])
    .toBuffer();
  const avatarPath = path.join(userDir, 'avatar.png');
  await fs.writeFile(avatarPath, buffer);
  return `/uploads/${username}/avatar.png`;
};

const createProfile = async (index) => {
  const username = `${randomItem(adjectives)}${randomItem(nouns)}${index}`;
  const existing = await getUser(username);
  if (existing) return null;
  const avatarPath = await createAvatar(username);
  const user = await createUser({
    username,
    password: 'password123',
    displayName: username.replace(/[0-9]+$/, ''),
    description: 'Generated via seed script. Update via JSON or admin panel.',
    badges: ['verified'],
    socials: [
      { label: 'Discord', url: 'https://discord.gg/guns' },
      { label: 'Website', url: 'https://guns.lol' }
    ],
    media: { avatar: avatarPath }
  });
  return user;
};

const main = async () => {
  ensurePaths();
  const { count } = parseArgs();
  const created = [];
  for (let i = 0; i < count; i += 1) {
    const user = await createProfile(i + 1);
    if (user) created.push(user);
  }
  console.log(`Seeded ${created.length} users into ${paths.users}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
