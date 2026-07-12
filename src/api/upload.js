import { get, post } from './request';
import { resolveErrorMessage } from './errorCodes';
import { getSessionId, ensureSessionReady } from './encrypt';

const API_BASE = '/api';
const __DEV__ = import.meta.env.DEV;

/**
 * 从 localStorage 读取会话 AES 密钥的原始字节，用于 HMAC 签名。
 * 服务端通过 X-Sid 查到同一个 AES key 来验签。
 */
async function getSessionKeyBytes() {
  await ensureSessionReady();
  const stored = localStorage.getItem('mysport:aesKey');
  if (!stored) return null;
  const binary = atob(stored);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function toHex(buf) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 签名直传文件（multipart）
 * HMAC-SHA256 签名，key = 会话 AES 密钥原始字节
 * 签名串：ts\nnonce\nsha256\npurpose
 */
export async function uploadFile(file, purpose = 'generic') {
  const arrayBuf = await file.arrayBuffer();
  const hashBuf = await crypto.subtle.digest('SHA-256', arrayBuf);
  const sha256 = toHex(hashBuf);

  const ts = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomUUID();
  const sid = getSessionId();
  const token = localStorage.getItem('mysport:token') || '';

  const sigPayload = `${ts}\n${nonce}\n${sha256}\n${purpose}`;
  const encoder = new TextEncoder();

  const aesKeyBytes = await getSessionKeyBytes();

  if (__DEV__) {
    console.log(
      '%c[UPLOAD] 签名调试',
      'background:#e65100;color:#fff;padding:2px 6px;border-radius:3px',
      {
        sid: sid || '(无)',
        hasAesKey: Boolean(aesKeyBytes),
        aesKeyLen: aesKeyBytes?.length,
        token: token ? `${token.slice(0, 16)}…` : '(无)',
        purpose,
        ts,
        sha256: `${sha256.slice(0, 16)}…`,
        sigPayload,
      },
    );
  }

  if (!aesKeyBytes) {
    if (__DEV__) {
      console.warn(
        '%c[UPLOAD] 无会话 AES 密钥，检查 localStorage 中 mysport:sid=%s, mysport:aesKey=%s',
        'color:#c62828;font-weight:bold',
        localStorage.getItem('mysport:sid') || '(空)',
        localStorage.getItem('mysport:aesKey') ? '(有值)' : '(空)',
      );
    }
  }

  const keyData = aesKeyBytes || encoder.encode(sid || token || 'upload');

  const hmacKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sigBuf = await crypto.subtle.sign('HMAC', hmacKey, encoder.encode(sigPayload));
  const sig = toHex(sigBuf);

  if (__DEV__) {
    console.log(
      '%c[UPLOAD] 签名结果',
      'background:#1b5e20;color:#fff;padding:2px 6px;border-radius:3px',
      { sig: `${sig.slice(0, 32)}…`, keySource: aesKeyBytes ? 'AES_SESSION' : 'FALLBACK' },
    );
  }

  const formData = new FormData();
  formData.append('file', file);

  const headers = {
    'X-Upload-Sig': sig,
    'X-Upload-Ts': ts,
    'X-Upload-Nonce': nonce,
    'X-File-Sha256': sha256,
    'X-File-Purpose': purpose,
  };
  if (token) headers['X-Customer-Token'] = `Bearer ${token}`;
  if (sid) headers['X-Sid'] = sid;

  const res = await fetch(`${API_BASE}/upload/file`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    let errMsg;
    try {
      const errJson = await res.json();
      if (__DEV__) {
        console.error('%c[UPLOAD] 服务端错误', 'color:#c62828;font-weight:bold', errJson);
      }
      errMsg = resolveErrorMessage(errJson.msg) || errJson.msg;
    } catch {
      errMsg = `HTTP ${res.status}`;
    }
    throw new Error(errMsg);
  }

  const json = await res.json();
  if (json.code !== 200 && json.code !== 0) {
    if (__DEV__) {
      console.error('%c[UPLOAD] 业务错误', 'color:#c62828;font-weight:bold', json);
    }
    throw new Error(resolveErrorMessage(json.msg) || json.msg || `${json.code}`);
  }
  return json;
}

/** 获取文件下载 URL，支持纯 fileId 或 upload://{fileId} 格式 */
export function getFileUrl(fileIdOrRef) {
  if (!fileIdOrRef) return '';
  const id = String(fileIdOrRef).replace(/^upload:\/\//, '');
  return `${API_BASE}/file/${id}`;
}

/** 将 avatar 引用转为可访问的图片 URL */
export function resolveAvatarUrl(avatar) {
  if (!avatar) return '';
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) return avatar;
  if (avatar.startsWith('/api/')) return avatar;
  if (avatar.startsWith('upload://')) return getFileUrl(avatar);
  return avatar;
}

/** 加密上传图片（信封加密，base64 字节，≤2MB） */
export async function uploadEncryptedImage(file, purpose = 'generic') {
  const arrayBuf = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  return post('/media/image', { image: base64, purpose });
}

/** WebSocket 握手票据 */
export async function fetchWsTicket() {
  return get('/ws/ticket');
}
