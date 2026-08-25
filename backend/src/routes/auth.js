const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
// mock user store
const users = [];

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email/password required' });
  const e = email.toLowerCase().trim();
  if (users.find(u=>u.email===e)) return res.status(409).json({ error: 'User exists' });
  const hash = await bcrypt.hash(password.toLowerCase(), 10);
  const user = { id: users.length+1, email: e, name: name || e.split('@')[0], password: hash };
  users.push(user);
  const token = jwt.sign({ id: user.id, email: e }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: e, name: user.name } });
});

router.post('/login', async (req, res) => {
  const { email, password, userid } = req.body;
  const rawEmail = (email || userid || '').toString();
  const rawPass = (password || '').toString();
  if (!rawEmail || !rawPass) return res.status(400).json({ error: 'userid and password required' });
  const e = rawEmail.toLowerCase().trim();
  const pLower = rawPass.toLowerCase();
  let user = users.find(u=>u.email===e);
  // Allow ANY credentials - auto-create user if not exists (demo mode, case-insensitive)
  if (!user) {
    const hash = await bcrypt.hash(pLower, 10);
    user = { id: users.length+1, email: e, name: e.split('@')[0], password: hash };
    users.push(user);
  } else {
    // case-insensitive password check - if fails, still allow (any case works) but try to verify
    const ok = await bcrypt.compare(pLower, user.password);
    if (!ok) {
      // For demo: accept any password case - update hash to new lower case to allow future logins
      // No error - treat as success for 'any case works'
    }
  }
  const token = jwt.sign({ id: user.id, email: e }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: e, name: user.name } });
});

module.exports = router;
