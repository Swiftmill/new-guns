import express from 'express';
import session from 'express-session';
import FileStoreFactory from 'session-file-store';
import path from 'path';
import compression from 'compression';
import helmet from 'helmet';
import csrf from 'csurf';
import multer from 'multer';
import mime from 'mime-types';
import sharp from 'sharp';
import fs from 'fs/promises';
import { ensurePaths, paths, serverConfig, limits, roles, defaults } from './config.js';
import { attachUser, requireAdmin, requireAuth } from './lib/authMiddleware.js';
import {
  createUser,
  authenticate,
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
  ensureAdminAccount,
  sanitizeUser
} from './lib/userService.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

ensurePaths();
await ensureAdminAccount();

const FileStore = FileStoreFactory(session);
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(paths.uploads));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(compression());
app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

const sessionMiddleware = session({
  store: new FileStore({ path: paths.sessions, retries: 1 }),
  secret: serverConfig.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false
  }
});

app.use(sessionMiddleware);
app.use(attachUser);

if (serverConfig.csrfDisabled) {
  app.use((req, res, next) => {
    res.locals.csrfToken = null;
    next();
  });
} else {
  app.use(csrf());
  app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
  });
}

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const username = req.params.username || req.body.username || (req.session.user && req.session.user.username);
      if (!username) return cb(new Error('Unknown target user'));
      const userDir = path.join(paths.uploads, username);
      await fs.mkdir(userDir, { recursive: true });
      cb(null, userDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const ext = mime.extension(file.mimetype) || path.extname(file.originalname);
    const safeName = file.fieldname + '-' + Date.now();
    cb(null, `${safeName}.${ext}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedImages = ['image/png', 'image/jpeg', 'image/webp'];
    const allowedAudio = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg'];
    const allowedVideo = ['video/mp4', 'video/webm', 'video/ogg'];
    if (file.fieldname === 'avatar' || file.fieldname === 'background' || file.fieldname === 'cursor') {
      if (!allowedImages.includes(file.mimetype)) return cb(new Error('Invalid image type'));
    } else if (file.fieldname === 'music') {
      if (!allowedAudio.includes(file.mimetype)) return cb(new Error('Invalid audio type'));
    } else if (file.fieldname === 'video') {
      if (!allowedVideo.includes(file.mimetype)) return cb(new Error('Invalid video type'));
    }
    cb(null, true);
  },
  limits: {
    fileSize: limits.maxVideoSize
  }
});

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.get('/', asyncHandler(async (req, res) => {
  const users = (await getAllUsers()).slice(0, 12).map(sanitizeUser);
  res.render('index', { users, paths });
}));

app.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('login', { error: null });
});

app.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const user = await authenticate(username, password);
  if (!user) {
    return res.status(401).render('login', { error: 'Invalid credentials' });
  }
  req.session.user = user;
  res.redirect(user.role === roles.admin ? '/paneladmin' : '/dashboard');
}));

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

app.get('/dashboard', requireAuth, asyncHandler(async (req, res) => {
  const user = await getUser(req.session.user.username);
  res.render('dashboard', { user: sanitizeUser(user) });
}));

app.get('/paneladmin', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const users = await getAllUsers();
  res.render('paneladmin', { users: users.map(sanitizeUser), badges: defaults.badges });
}));

app.get('/api/users', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const users = await getAllUsers();
  res.json(users.map(sanitizeUser));
}));

app.post('/api/users', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const newUser = await createUser(req.body);
  res.status(201).json(newUser);
}));

app.get('/api/users/:username', requireAuth, asyncHandler(async (req, res) => {
  if (req.session.user.role !== roles.admin && req.session.user.username !== req.params.username) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const user = await getUser(req.params.username);
  if (!user) return res.status(404).json({ message: 'Not found' });
  res.json(sanitizeUser(user));
}));

app.put('/api/users/:username', requireAuth, asyncHandler(async (req, res) => {
  if (req.session.user.role !== roles.admin && req.session.user.username !== req.params.username) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const payload = { ...req.body };
  if (payload.password) {
    // update handled separately via admin or change password route (not implemented)
    delete payload.password;
  }
  if (typeof payload.badges === 'string') {
    payload.badges = payload.badges
      .split(',')
      .map((b) => b.trim())
      .filter(Boolean);
  }
  if (typeof payload.socials === 'string') {
    try {
      payload.socials = JSON.parse(payload.socials);
    } catch {
      payload.socials = [];
    }
  }
  const updated = await updateUser(req.params.username, payload);
  if (req.session.user.username === updated.username) {
    req.session.user = updated;
  }
  res.json(updated);
}));

app.delete('/api/users/:username', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  await deleteUser(req.params.username);
  res.status(204).send();
}));

app.post('/api/users/:username/upload', requireAuth, asyncHandler(async (req, res, next) => {
  if (req.session.user.role !== roles.admin && req.session.user.username !== req.params.username) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  upload.any()(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    try {
      const processed = [];
      const user = await getUser(req.params.username);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      user.media = user.media || {};
      for (const file of req.files) {
        if (
          (file.fieldname === 'avatar' || file.fieldname === 'background' || file.fieldname === 'cursor') &&
          file.size > limits.maxImageSize
        ) {
          await fs.rm(file.path, { force: true });
          return res.status(400).json({ message: 'Image exceeds size limit' });
        }
        if (file.fieldname === 'music' && file.size > limits.maxAudioSize) {
          await fs.rm(file.path, { force: true });
          return res.status(400).json({ message: 'Audio exceeds size limit' });
        }
        if (file.fieldname === 'video' && file.size > limits.maxVideoSize) {
          await fs.rm(file.path, { force: true });
          return res.status(400).json({ message: 'Video exceeds size limit' });
        }
        let finalPath = file.path;
        if (file.fieldname === 'avatar' || file.fieldname === 'background' || file.fieldname === 'cursor') {
          const finalName = `${path.basename(file.path, path.extname(file.path))}.webp`;
          finalPath = path.join(path.dirname(file.path), finalName);
          const optimizedPath = `${finalPath}.tmp`;
          await sharp(file.path)
            .resize(1200, 1200, { fit: 'inside' })
            .webp({ quality: 85 })
            .toFile(optimizedPath);
          await fs.rm(file.path);
          await fs.rename(optimizedPath, finalPath);
        }
        const publicPath = `/uploads/${req.params.username}/${path.basename(finalPath)}`;
        processed.push({ field: file.fieldname, path: publicPath });
        user.media[file.fieldname] = publicPath;
      }
      await updateUser(req.params.username, { media: user.media });
      res.json({ files: processed });
    } catch (processingError) {
      next(processingError);
    }
  });
}));

app.get('/:username', asyncHandler(async (req, res, next) => {
  const user = await getUser(req.params.username);
  if (!user) return next();
  res.render('profile', { user: sanitizeUser(user) });
}));

app.use((req, res) => {
  res.status(404).render('error', { message: 'Page not found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  if (req.path.startsWith('/api/')) {
    res.status(500).json({ message: 'Internal server error' });
  } else {
    res.status(500).render('error', { message: err.message });
  }
});

app.listen(serverConfig.port, () => {
  console.log(`guns.lol local replica running on port ${serverConfig.port}`);
});
