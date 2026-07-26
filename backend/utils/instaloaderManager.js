/**
 * instaloaderManager.js
 *
 * Manages:
 *  - Saving and loading Instagram session files (one per account)
 *  - An in-memory registry of active login processes (for 2FA code injection)
 *
 * Instagram scraping itself goes through Python + the `instaloader` pip package
 * (see backend/routes/instagram.js's detectPython()/loginWithPython()), not a
 * standalone binary — pip install/invoke is identical on Windows, macOS, and
 * Linux, so this manager has no platform-specific download logic.
 */

const fs   = require('fs');
const path = require('path');

const { SESSIONS_DIR } = require('./paths');

const ACCOUNTS_FILE = path.join(SESSIONS_DIR, 'accounts.json');

// ── Public API ───────────────────────────────────────────────────────────────

function getSessionPath(username) { return path.join(SESSIONS_DIR, `session-${username}`); }

// ── Account / session management ─────────────────────────────────────────────

function loadAccounts() {
  try {
    if (fs.existsSync(ACCOUNTS_FILE)) {
      return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
    }
  } catch {}
  return [];
}

function saveAccounts(accounts) {
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf8');
}

function getAccounts() {
  return loadAccounts().map((a) => ({
    ...a,
    sessionExists: fs.existsSync(getSessionPath(a.username)),
  }));
}

function addAccount(username) {
  const accounts = loadAccounts();
  if (!accounts.find((a) => a.username === username)) {
    accounts.push({ username, addedAt: new Date().toISOString() });
    saveAccounts(accounts);
  }
}

function removeAccount(username) {
  const accounts = loadAccounts().filter((a) => a.username !== username);
  saveAccounts(accounts);
  const sessionPath = getSessionPath(username);
  try { if (fs.existsSync(sessionPath)) fs.unlinkSync(sessionPath); } catch {}
}

// ── Active login process registry (for 2FA code injection) ───────────────────
// key: username, value: { proc, resolve, reject }
const activeLogins = new Map();

function registerLoginProc(username, proc, resolve, reject) {
  activeLogins.set(username, { proc, resolve, reject });
}

function getActiveLogin(username) { return activeLogins.get(username) || null; }
function clearActiveLogin(username) { activeLogins.delete(username); }

module.exports = {
  getSessionPath,
  getAccounts,
  addAccount,
  removeAccount,
  registerLoginProc,
  getActiveLogin,
  clearActiveLogin,
  SESSIONS_DIR,
};
