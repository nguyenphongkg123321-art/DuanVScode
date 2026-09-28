export class ApiError extends Error {
  constructor(message, status, details = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body !== undefined && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  let response;
  try {
    response = await fetch(path, {
      ...options,
      credentials: 'same-origin',
      headers,
      body: options.body === undefined || typeof options.body === 'string'
        ? options.body
        : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError('Không thể kết nối đến máy chủ.', 0);
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : null;
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new CustomEvent('hub:auth-expired'));
    throw new ApiError(payload?.error || 'Yêu cầu không thành công.', response.status, payload || {});
  }
  return payload;
}
