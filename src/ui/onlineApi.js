/**
 * Shared Hogwarts Online API client: request timeout + friendly offline / non-JSON error handling.
 */

const OFFLINE_MSG = 'Máy chủ Online đang ngoại tuyến — tiến trình chơi vẫn được lưu trên máy này.';

export async function apiRequest(path, method = 'GET', payload = null, timeoutMs = 6000) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (payload) opts.body = JSON.stringify(payload);
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    opts.signal = AbortSignal.timeout(timeoutMs);
  }

  let res;
  try {
    res = await fetch(path, opts);
  } catch {
    throw new Error(OFFLINE_MSG);
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // Dev proxy returns an empty/HTML 5xx body when the API server is down
    throw new Error(res.status >= 500 ? OFFLINE_MSG : `Lỗi máy chủ (${res.status}).`);
  }
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || (res.status >= 500 ? OFFLINE_MSG : 'Không thể kết nối Máy Chủ Phép Thuật.'));
  }
  return data;
}

