/**
 * 登录加密依赖 Web Crypto。
 * 手机浏览器在非 HTTPS 页面里 crypto.subtle 为空，直接读 importKey 会抛错。
 * 有 subtle 时走原生；没有时用 node-forge 做同样的 AES-GCM / RSA-OAEP。
 */

let forgePromise = null;

function nativeSubtle() {
  const subtle = globalThis.crypto?.subtle;
  if (subtle && typeof subtle.importKey === 'function') return subtle;
  return null;
}

async function getForge() {
  if (!forgePromise) {
    forgePromise = import('node-forge').then((mod) => mod.default ?? mod);
  }
  return forgePromise;
}

function bytesToBinary(bytes) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (let i = 0; i < view.length; i += 1) binary += String.fromCharCode(view[i]);
  return binary;
}

function binaryToBytes(binary) {
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function isFallbackKey(key) {
  return Boolean(key && key.__fallback);
}

/** AES-GCM 原始密钥。原生环境返回 CryptoKey。 */
export async function importAesKey(rawBytes, extractable = false) {
  const subtle = nativeSubtle();
  if (subtle) {
    return subtle.importKey(
      'raw',
      rawBytes,
      { name: 'AES-GCM' },
      extractable,
      ['encrypt', 'decrypt'],
    );
  }
  return { __fallback: 'aes', raw: new Uint8Array(rawBytes) };
}

/** RSA-OAEP SHA-256 公钥。pem 为 SPKI PEM。 */
export async function importRsaPublicKey(pem) {
  const subtle = nativeSubtle();
  if (subtle) {
    const b64 = pem
      .replace(/-----BEGIN PUBLIC KEY-----/, '')
      .replace(/-----END PUBLIC KEY-----/, '')
      .replace(/\s/g, '');
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return subtle.importKey(
      'spki',
      bytes.buffer,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      false,
      ['encrypt'],
    );
  }
  return { __fallback: 'rsa', pem };
}

export async function exportAesKey(key) {
  if (isFallbackKey(key)) return key.raw.buffer.slice(key.raw.byteOffset, key.raw.byteOffset + key.raw.byteLength);
  const subtle = nativeSubtle();
  if (!subtle) throw new Error('CRYPTO_UNAVAILABLE');
  return subtle.exportKey('raw', key);
}

/** AES-GCM，返回 ciphertext || tag，与 Web Crypto 一致。 */
export async function aesGcmEncrypt(key, iv, plaintext) {
  if (!isFallbackKey(key)) {
    const subtle = nativeSubtle();
    return subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, plaintext);
  }
  const forge = await getForge();
  const cipher = forge.cipher.createCipher('AES-GCM', bytesToBinary(key.raw));
  cipher.start({ iv: bytesToBinary(iv), tagLength: 128 });
  cipher.update(forge.util.createBuffer(bytesToBinary(plaintext)));
  if (!cipher.finish()) throw new Error('AES_GCM_ENCRYPT_FAILED');
  return binaryToBytes(cipher.output.getBytes() + cipher.mode.tag.getBytes()).buffer;
}

export async function aesGcmDecrypt(key, iv, data) {
  if (!isFallbackKey(key)) {
    const subtle = nativeSubtle();
    return subtle.decrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, data);
  }
  const forge = await getForge();
  const all = bytesToBinary(data);
  const ciphertext = all.slice(0, -16);
  const tag = all.slice(-16);
  const decipher = forge.cipher.createDecipher('AES-GCM', bytesToBinary(key.raw));
  decipher.start({
    iv: bytesToBinary(iv),
    tagLength: 128,
    tag: forge.util.createBuffer(tag),
  });
  decipher.update(forge.util.createBuffer(ciphertext));
  if (!decipher.finish()) throw new Error('AES_GCM_DECRYPT_FAILED');
  return binaryToBytes(decipher.output.getBytes()).buffer;
}

export async function rsaOaepEncrypt(key, data) {
  if (!isFallbackKey(key)) {
    const subtle = nativeSubtle();
    return subtle.encrypt({ name: 'RSA-OAEP' }, key, data);
  }
  const forge = await getForge();
  const publicKey = forge.pki.publicKeyFromPem(key.pem);
  const encrypted = publicKey.encrypt(bytesToBinary(data), 'RSA-OAEP', {
    md: forge.md.sha256.create(),
    mgf1: { md: forge.md.sha256.create() },
  });
  return binaryToBytes(encrypted).buffer;
}

export async function sha256(data) {
  const subtle = nativeSubtle();
  if (subtle) return subtle.digest('SHA-256', data);
  const forge = await getForge();
  const md = forge.md.sha256.create();
  md.update(bytesToBinary(data));
  return binaryToBytes(md.digest().getBytes()).buffer;
}

export async function hmacSha256(rawKey, data) {
  const subtle = nativeSubtle();
  if (subtle) {
    const hmacKey = await subtle.importKey(
      'raw',
      rawKey,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    return subtle.sign('HMAC', hmacKey, data);
  }
  const forge = await getForge();
  const hmac = forge.hmac.create();
  hmac.start('sha256', bytesToBinary(rawKey));
  hmac.update(bytesToBinary(data));
  return binaryToBytes(hmac.digest().getBytes()).buffer;
}

export function randomBytes(length) {
  if (!globalThis.crypto?.getRandomValues) throw new Error('CRYPTO_UNAVAILABLE');
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

export function randomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
