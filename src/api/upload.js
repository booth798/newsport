import { get, post } from './request';
import { resolveErrorMessage } from './errorCodes';

const API_BASE = '/api';

/**
 * 签名直传文件（multipart）
 * 需要 HMAC 校验头：X-Upload-Sig, X-Upload-Ts, X-Upload-Nonce, X-File-Sha256, X-File-Purpose
 */
export async function uploadFile(file, purpose = 'generic') {
  const arrayBuf = await file.arrayBuffer();
  const hashBuf = await crypto.subtle.digest('SHA-256', arrayBuf);
  const sha256 = Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const ts = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomUUID();

  const token = localStorage.getItem('mysport:token') || '';
  const sessionId = localStorage.getItem('mysport:sid') || '';

  const sigPayload = `${ts}\n${nonce}\n${sha256}\n${purpose}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(sessionId || token || 'upload');
  const hmacKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sigBuf = await crypto.subtle.sign('HMAC', hmacKey, encoder.encode(sigPayload));
  const sig = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const formData = new FormData();
  formData.append('file', file);

  const headers = {
    'X-Upload-Sig': sig,
    'X-Upload-Ts': ts,
    'X-Upload-Nonce': nonce,
    'X-File-Sha256': sha256,
    'X-File-Purpose': purpose,
  };
  if (token) headers['X-Customer-Token'] = token;
  if (sessionId) headers['X-Sid'] = sessionId;

  const res = await fetch(`${API_BASE}/upload/file`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    let errMsg;
    try {
      const errJson = await res.json();
      errMsg = resolveErrorMessage(errJson.msg) || errJson.msg;
    } catch {
      errMsg = `HTTP ${res.status}`;
    }
    throw new Error(errMsg);
  }

  const json = await res.json();
  if (json.code !== 200 && json.code !== 0) {
    throw new Error(resolveErrorMessage(json.msg) || json.msg || `${json.code}`);
  }
  return json;
}

/** 获取文件下载 URL */
export function getFileUrl(fileId) {
  return `${API_BASE}/file/${fileId}`;
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
