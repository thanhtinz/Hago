import { useEffect, useRef } from 'react';
import { Platform, Vibration } from 'react-native';
import { load, save } from '../net/store';

/**
 * Âm thanh và rung của bàn cờ.
 *
 * **Âm tự tổng hợp, không có tệp âm thanh nào.** Cùng một lý lẽ với việc
 * cả app vẽ bằng SVG: một tiếng "cạch" đặt quân là hai mươi mili giây sóng
 * hình sin tắt dần, mô tả nó bằng bốn con số thì đúng hơn là đóng gói một
 * tệp `.mp3` 8 KB, và nó không bao giờ tải chậm hay tải hỏng.
 *
 * **Giới hạn phải nói thẳng:** phần âm dựa vào Web Audio, nên nó kêu trên
 * bản web và trên WebView, còn bản iOS/Android thật thì **im lặng** cho
 * tới khi cài `expo-audio`. Phần rung thì ngược lại: `Vibration` có sẵn
 * trong React Native, chạy trên điện thoại thật và không làm gì trên web.
 * Hai nửa bù nhau, và không nửa nào giả vờ là mình đang chạy.
 */

type Sound = 'dat' | 'an' | 'thang' | 'thua' | 'hoa' | 'bao';

/** Người dùng tắt được cả hai, và lựa chọn đó nhớ qua lần mở sau. */
let on = load('am-thanh', true);
let buzz = load('rung', true);

export const feedback = {
  soundOn: () => on,
  buzzOn: () => buzz,
  setSound(v: boolean) {
    on = v;
    save('am-thanh', v);
    // Bật lên thì kêu một tiếng ngay: nghe thử là cách duy nhất biết mình
    // vừa bật cái gì.
    if (v) play('dat');
  },
  setBuzz(v: boolean) {
    buzz = v;
    save('rung', v);
    if (v) Vibration.vibrate(12);
  },

  /** Đặt một quân xuống bàn. */
  dat() {
    play('dat');
    tap(10);
  },
  /** Ăn quân, hoặc gánh được một chuỗi. */
  an() {
    play('an');
    tap(24);
  },
  /** Ván kết thúc. */
  het(kind: 'thang' | 'thua' | 'hoa') {
    play(kind);
    tap(kind === 'thang' ? 40 : 18);
  },
  /** Có việc cần chú ý: lời rủ đấu, tin nhắn, đối thủ cầu hoà. */
  bao() {
    play('bao');
    tap(14);
  },
};

function tap(ms: number): void {
  if (!buzz) return;
  // `Vibration` không làm gì trên web, và trên iOS nó bỏ qua độ dài — cả
  // hai đều là hành vi đúng của nền tảng, không phải lỗi cần chữa ở đây.
  if (Platform.OS !== 'web') Vibration.vibrate(ms);
}

/**
 * Mô tả một tiếng: chuỗi các chặng (tần số, thời điểm bắt đầu, độ dài).
 *
 * Quãng chọn theo thang ngũ cung, cùng mạch với bộ mặt của app: quãng
 * trưởng của nhạc phương Tây nghe ra "giao diện phần mềm", còn quãng năm
 * và quãng bốn nghe ra tiếng gõ mõ, tiếng đàn tranh.
 */
const NOTES: Record<Sound, { hz: number; at: number; len: number; gain?: number }[]> = {
  // Cạch gọn một tiếng, hơi đục — gỗ chạm gỗ.
  dat: [{ hz: 320, at: 0, len: 0.07, gain: 0.16 }],
  // Ăn quân: hai tiếng, tiếng sau cao hơn một quãng năm.
  an: [
    { hz: 400, at: 0, len: 0.06, gain: 0.16 },
    { hz: 600, at: 0.06, len: 0.1, gain: 0.14 },
  ],
  // Thắng: ba nốt đi lên, ngũ cung.
  thang: [
    { hz: 523, at: 0, len: 0.12, gain: 0.14 },
    { hz: 659, at: 0.1, len: 0.12, gain: 0.14 },
    { hz: 784, at: 0.2, len: 0.26, gain: 0.15 },
  ],
  // Thua: hai nốt đi xuống, chậm hơn.
  thua: [
    { hz: 392, at: 0, len: 0.16, gain: 0.12 },
    { hz: 294, at: 0.14, len: 0.3, gain: 0.12 },
  ],
  // Hoà: hai nốt cùng cao độ, như hai bên cùng gật đầu.
  hoa: [
    { hz: 440, at: 0, len: 0.12, gain: 0.11 },
    { hz: 440, at: 0.16, len: 0.2, gain: 0.11 },
  ],
  // Báo: một tiếng chuông nhỏ, cao và ngắn.
  bao: [{ hz: 880, at: 0, len: 0.09, gain: 0.12 }],
};

interface AudioCtx {
  currentTime: number;
  destination: unknown;
  state: string;
  resume(): Promise<void>;
  createOscillator(): {
    type: string;
    frequency: { value: number };
    connect(n: unknown): void;
    start(t: number): void;
    stop(t: number): void;
  };
  createGain(): {
    gain: { setValueAtTime(v: number, t: number): void; exponentialRampToValueAtTime(v: number, t: number): void };
    connect(n: unknown): void;
  };
}

let ctx: AudioCtx | null = null;

function audio(): AudioCtx | null {
  if (ctx) return ctx;
  const g = globalThis as { AudioContext?: new () => AudioCtx; webkitAudioContext?: new () => AudioCtx };
  const C = g.AudioContext ?? g.webkitAudioContext;
  if (!C) return null;
  try {
    ctx = new C();
    return ctx;
  } catch {
    return null;
  }
}

function play(s: Sound): void {
  if (!on) return;
  const a = audio();
  if (!a) return;
  // Trình duyệt khoá âm thanh cho tới khi người dùng chạm lần đầu. Mọi
  // tiếng ở đây đều phát **từ một cú chạm**, nên gọi `resume()` là đủ.
  if (a.state === 'suspended') void a.resume().catch(() => undefined);
  const t0 = a.currentTime;
  for (const n of NOTES[s]) {
    try {
      const osc = a.createOscillator();
      const vol = a.createGain();
      // Sóng tam giác: mềm hơn sóng vuông, có thân hơn sóng sin. Sóng sin
      // thuần nghe ra tiếng máy đo, không ra tiếng quân cờ.
      osc.type = 'triangle';
      osc.frequency.value = n.hz;
      // Tắt dần theo hàm mũ chứ không cắt phựt: cắt phựt tạo một tiếng
      // "tách" ở cuối mỗi nốt, và tiếng tách đó nghe rõ hơn chính nốt nhạc.
      vol.gain.setValueAtTime(n.gain ?? 0.14, t0 + n.at);
      vol.gain.exponentialRampToValueAtTime(0.0001, t0 + n.at + n.len);
      osc.connect(vol);
      vol.connect(a.destination);
      osc.start(t0 + n.at);
      osc.stop(t0 + n.at + n.len + 0.02);
    } catch {
      /* Một nốt không phát được thì thôi, đừng làm hỏng nước cờ. */
    }
  }
}

/**
 * Nối phản hồi vào một ván cờ.
 *
 * Gọi ở **đúng một chỗ** cho mỗi ván: `ply` tăng thì kêu tiếng đặt quân,
 * kết quả xuất hiện thì kêu tiếng kết ván. Đặt trong `useMatch()` dùng
 * chung thì mỗi component gọi nó là một lần kêu, và màn chơi có bốn.
 *
 * Bỏ qua lần dựng đầu tiên: mở lại một ván đang dở không phải là vừa có
 * ai đi một nước.
 */
export function useMatchFeedback(ply: number, ended: 'thang' | 'thua' | 'hoa' | null): void {
  const last = useRef<number | null>(null);
  const said = useRef(false);
  useEffect(() => {
    if (last.current !== null && ply > last.current) feedback.dat();
    last.current = ply;
  }, [ply]);
  useEffect(() => {
    if (!ended) {
      said.current = false;
      return;
    }
    if (said.current) return;
    said.current = true;
    feedback.het(ended);
  }, [ended]);
}
