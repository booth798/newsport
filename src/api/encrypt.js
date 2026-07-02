import { get } from './request';

let cachedKey = null;
let sessionAesKey = null;
let sessionId = null;

export function getSessionId() {
  return sessionId || localStorage.getItem('mysport:sid') || '';
}

export function hasSession() {
  return Boolean(getSessionId() && sessionAesKey);
}

export function clearSession() {
  sessionAesKey = null;
  sessionId = null;
  localStorage.removeItem('mysport:sid');
  localStorage.removeItem('mysport:aesKey');
}

function restoreSessionKey() {
  if (sessionAesKey) return;
  const stored = localStorage.getItem('mysport:aesKey');
  const sid = localStorage.getItem('mysport:sid');
  if (stored && sid) {
    sessionId = sid;
    const binary = atob(stored);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    crypto.subtle
      .importKey('raw', bytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
      .then((k) => { sessionAesKey = k; })
      .catch(() => { /* 失败则下次登录重建 */ });
  }
}
restoreSessionKey();

export async function fetchPubKey() {
  if (cachedKey && cachedKey.expiresAt > Date.now() / 1000) {
    return cachedKey;
  }
  const res = await get('/auth/pubkey');
  cachedKey = res.data;
  return cachedKey;
}

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

function pemToArrayBuffer(pem) {
  const b64 = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\n/g, '')
    .trim();
  return b64Decode(b64).buffer;
}

async function importRsaKey(pem) {
  const keyData = pemToArrayBuffer(pem);
  return crypto.subtle.importKey(
    'spki',
    keyData,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  );
}

function makeNonce() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function aesEncrypt(aesKey, plainObj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(plainObj));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    aesKey,
    plaintext,
  );
  return { iv, ciphertext };
}

async function aesDecrypt(aesKey, ivB64, dataB64) {
  const iv = b64Decode(ivB64);
  const data = b64Decode(dataB64);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    aesKey,
    data,
  );
  return JSON.parse(new TextDecoder().decode(plain));
}

/**
 * BOOTSTRAP 信封加密（登录/注册用）
 * 返回的 aesKeyForSession 可用于后续 SESSION_AES
 */
export async function bootstrapEncrypt(bodyObj) {
  const pubKeyInfo = await fetchPubKey();
  const rsaKey = await importRsaKey(pubKeyInfo.pem);

  const aesKeyRaw = crypto.getRandomValues(new Uint8Array(32));

  const aesKey = await crypto.subtle.importKey(
    'raw',
    aesKeyRaw,
    { name: 'AES-GCM' },
    true,
    ['encrypt', 'decrypt'],
  );

  const { iv, ciphertext } = await aesEncrypt(aesKey, bodyObj);

  const encSk = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    rsaKey,
    aesKeyRaw,
  );

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

/**
 * 解密 BOOTSTRAP / SESSION 响应（响应体为 {iv, d}）
 */
export async function decryptResponse(aesKey, responseBody) {
  if (!responseBody || !responseBody.iv || !responseBody.d) {
    return responseBody;
  }
  return aesDecrypt(aesKey, responseBody.iv, responseBody.d);
}

/**
 * 保存登录后的会话密钥，供后续 SESSION_AES 使用
 */
export async function saveSession(sid, aesKey) {
  sessionId = sid;
  sessionAesKey = aesKey;
  localStorage.setItem('mysport:sid', sid);
  const exported = await crypto.subtle.exportKey('raw', aesKey);
  localStorage.setItem('mysport:aesKey', b64Encode(exported));
}

/**
 * SESSION_AES 加密（登录后的带 body 请求）
 */
export async function sessionEncrypt(bodyObj) {
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

/**
 * 解密 SESSION_AES 响应
 */
export async function decryptSessionResponse(responseBody) {
  if (!sessionAesKey) {
    throw new Error('NO_SESSION_KEY');
  }
  return aesDecrypt(sessionAesKey, responseBody.iv, responseBody.d);
}
