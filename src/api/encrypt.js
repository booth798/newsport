import { get } from './request';
import {
  aesGcmDecrypt,
  aesGcmEncrypt,
  exportAesKey,
  importAesKey,
  importRsaPublicKey,
  randomBytes,
  rsaOaepEncrypt,
} from '@/utils/webCrypto';

let cachedPubKey = null;
let sessionAesKey = null;
let sessionId = null;
let restorePromise = null;

export function getSessionId() {
  return sessionId || localStorage.getItem('mysport:sid') || '';
}

export function clearSession() {
  sessionAesKey = null;
  sessionId = null;
  restorePromise = null;
  localStorage.removeItem('mysport:sid');
  localStorage.removeItem('mysport:aesKey');
}

async function doRestore() {
  const stored = localStorage.getItem('mysport:aesKey');
  const sid = localStorage.getItem('mysport:sid');
  if (!stored || !sid) return;
  try {
    const binary = atob(stored);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    sessionAesKey = await importAesKey(bytes, false);
    sessionId = sid;
  } catch {
    sessionAesKey = null;
    sessionId = null;
  }
}

restorePromise = doRestore();

export async function ensureSessionReady() {
  if (restorePromise) await restorePromise;
}

/**
 * 从 localStorage 重新载入加密会话到内存。
 * 用于多标签切换账号：他页已写入新 sid/aesKey，本页内存仍是旧会话。
 */
export async function reloadSessionFromStorage() {
  sessionAesKey = null;
  sessionId = null;
  restorePromise = doRestore();
  await restorePromise;
}

export async function hasSession() {
  await ensureSessionReady();
  return Boolean(sessionId && sessionAesKey);
}

// ─── base64 helpers ───

function b64Encode(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function b64Decode(str) {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ─── RSA ───

async function importRsaKey(pem) {
  return importRsaPublicKey(pem);
}

export async function fetchPubKey() {
  if (cachedPubKey && cachedPubKey.expiresAt > Date.now() / 1000) {
    return cachedPubKey;
  }
  const res = await get('/auth/pubkey');
  cachedPubKey = res.data;
  return cachedPubKey;
}

// ─── AES-GCM helpers ───

function makeNonce() {
  return Array.from(randomBytes(16))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function aesEncrypt(aesKey, plainObj) {
  const iv = randomBytes(12);
  const plaintext = new TextEncoder().encode(JSON.stringify(plainObj));
  const ciphertext = await aesGcmEncrypt(aesKey, iv, plaintext);
  return { iv, ciphertext };
}

async function aesDecrypt(aesKey, ivB64, dataB64) {
  const iv = b64Decode(ivB64);
  const data = b64Decode(dataB64);
  const plain = await aesGcmDecrypt(aesKey, iv, data);
  return JSON.parse(new TextDecoder().decode(plain));
}

// ─── BOOTSTRAP 信封（登录/注册/找回密码） ───

export async function bootstrapEncrypt(bodyObj) {
  const pubKeyInfo = await fetchPubKey();
  const rsaKey = await importRsaKey(pubKeyInfo.pem);

  const aesKeyRaw = randomBytes(32);
  const aesKey = await importAesKey(aesKeyRaw, true);

  const { iv, ciphertext } = await aesEncrypt(aesKey, bodyObj);
  const encSk = await rsaOaepEncrypt(rsaKey, aesKeyRaw);

  const encryptedBody = {
    encSk: b64Encode(encSk),
    iv: b64Encode(iv),
    d: b64Encode(ciphertext),
    t: Math.floor(Date.now() / 1000),
    n: makeNonce(),
  };

  const headers = {
    'X-Encrypted': '1',
    'X-Bootstrap': '1',
    'X-Kid': pubKeyInfo.kid,
  };

  return { encryptedBody, headers, aesKey };
}

// ─── 解密响应（BOOTSTRAP / SESSION 通用） ───

export async function decryptResponse(aesKey, responseBody) {
  if (!responseBody || !responseBody.iv || !responseBody.d) {
    return responseBody;
  }
  return aesDecrypt(aesKey, responseBody.iv, responseBody.d);
}

export async function decryptSessionResponse(responseBody) {
  await ensureSessionReady();
  if (!sessionAesKey) throw new Error('NO_SESSION_KEY');
  return aesDecrypt(sessionAesKey, responseBody.iv, responseBody.d);
}

// ─── SESSION_AES（登录后的带 body 写请求） ───

export async function sessionEncrypt(bodyObj) {
  await ensureSessionReady();
  if (!sessionAesKey || !sessionId) {
    throw new Error('NO_SESSION');
  }
  const { iv, ciphertext } = await aesEncrypt(sessionAesKey, bodyObj);

  const encryptedBody = {
    iv: b64Encode(iv),
    d: b64Encode(ciphertext),
    t: Math.floor(Date.now() / 1000),
    n: makeNonce(),
  };

  const headers = {
    'X-Encrypted': '1',
    'X-Sid': sessionId,
  };

  return { encryptedBody, headers };
}

// ─── 会话持久化 ───

export async function saveSession(sid, aesKey) {
  sessionId = sid;
  sessionAesKey = aesKey;
  localStorage.setItem('mysport:sid', sid);
  const exported = await exportAesKey(aesKey);
  localStorage.setItem('mysport:aesKey', b64Encode(exported));
}
