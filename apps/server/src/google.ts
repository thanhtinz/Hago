import { createPublicKey, createVerify } from 'node:crypto';

/**
 * Xác minh ID token của Google.
 *
 * Luồng đăng nhập: app mở trang chọn tài khoản của Google, Google trả về một
 * **ID token** đã ký, app gửi token đó lên đây. Máy chủ **tự kiểm chữ ký**
 * bằng khoá công khai của Google chứ không gọi endpoint `tokeninfo`: một lần
 * gọi mạng đồng bộ trên đường đăng nhập là một chỗ chết thêm, và khoá thì
 * đổi vài ngày một lần nên nhớ đệm được.
 *
 * **Không bao giờ tin `sub` do client gửi thẳng.** Chỉ `sub` lấy ra từ token
 * đã qua kiểm chữ ký, đúng `aud`, đúng `iss`, còn hạn, mới được dùng.
 */

const CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);

export interface GoogleProfile {
  sub: string;
  email: string | null;
  name: string;
  picture: string | null;
}

interface Jwk {
  kid: string;
  n: string;
  e: string;
  alg?: string;
}

let cache: { at: number; keys: Map<string, Jwk> } | null = null;
const CACHE_MS = 60 * 60 * 1000;

async function keys(fetchImpl: typeof fetch): Promise<Map<string, Jwk>> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.keys;
  const res = await fetchImpl(CERTS_URL);
  if (!res.ok) throw new Error(`Không lấy được khoá công khai của Google: ${res.status}`);
  const body = (await res.json()) as { keys: Jwk[] };
  const map = new Map(body.keys.map((k) => [k.kid, k]));
  cache = { at: Date.now(), keys: map };
  return map;
}

const b64 = (s: string) => Buffer.from(s, 'base64url');

/** Có cấu hình Google chưa. Chưa thì app ẩn nút thay vì hiện ra rồi báo lỗi. */
export function googleConfigured(): boolean {
  return !!process.env.GOOGLE_CLIENT_ID;
}

export async function verifyGoogleIdToken(
  idToken: string,
  opts: { clientId?: string; fetchImpl?: typeof fetch; now?: number } = {},
): Promise<GoogleProfile> {
  const clientId = opts.clientId ?? process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('Chưa đặt GOOGLE_CLIENT_ID nên chưa bật đăng nhập Google');

  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('Token không đúng dạng JWT');
  const [h, p, sig] = parts as [string, string, string];
  const header = JSON.parse(b64(h).toString()) as { alg: string; kid: string };
  if (header.alg !== 'RS256') throw new Error(`Thuật toán ký không chấp nhận: ${header.alg}`);

  const jwk = (await keys(opts.fetchImpl ?? fetch)).get(header.kid);
  if (!jwk) throw new Error('Không có khoá công khai khớp kid');

  const key = createPublicKey({ key: { kty: 'RSA', n: jwk.n, e: jwk.e }, format: 'jwk' });
  const v = createVerify('RSA-SHA256');
  v.update(`${h}.${p}`);
  if (!v.verify(key, b64(sig))) throw new Error('Chữ ký token không hợp lệ');

  const claims = JSON.parse(b64(p).toString()) as {
    iss: string;
    aud: string;
    sub: string;
    exp: number;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };
  if (!ISSUERS.has(claims.iss)) throw new Error(`Người phát hành token không đúng: ${claims.iss}`);
  // Không kiểm `aud` thì token Google cấp cho **ứng dụng bất kỳ khác** cũng
  // đăng nhập được vào đây. Đây là lỗi hay gặp nhất khi tự cài đăng nhập Google.
  if (claims.aud !== clientId) throw new Error('Token này không cấp cho ứng dụng của chúng ta');
  const now = opts.now ?? Date.now();
  if (claims.exp * 1000 < now) throw new Error('Token đã hết hạn');

  return {
    sub: claims.sub,
    // Email chưa xác minh thì **không** dùng để nối vào tài khoản email sẵn có:
    // nối theo email chưa xác minh là cho người ta chiếm tài khoản người khác.
    email: claims.email && claims.email_verified ? claims.email.toLowerCase() : null,
    name: claims.name ?? 'Người chơi',
    picture: claims.picture ?? null,
  };
}
