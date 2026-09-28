import React, { useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BotLevel, Outcome } from '@co/core';
import { Icon } from './Icon';
import { Btn, Clock, IconBtn, Panel, Tag, Txt } from './parts';
import { AppBackdrop, Rule } from './surface';
import { A, R, S, glow, lift } from './theme';

/**
 * Khung chung của mọi màn chơi.
 *
 * Chín bộ môn dùng chung đúng bộ khung này: thanh tiêu đề, hai thanh người
 * chơi có đồng hồ, hàng nút, tấm kết quả, tấm chọn mức máy. Chỉ **mặt bàn và
 * bàn cờ** là riêng của từng game.
 *
 * Tách ra ngay ở game thứ hai chứ không đợi game thứ năm: mỗi bản chép thêm
 * là một chỗ để đồng hồ chạy khác nhau, nút đầu hàng đi đường khác nhau, và
 * hai màn chơi lệch nhau vài pixel mà không ai biết vì sao.
 */

export const LEVEL_NAME: Record<BotLevel, string> = { 1: 'Dễ', 2: 'Vừa', 3: 'Khó' };

export interface SeatBarProps {
  name: string;
  sub: string;
  /** Quân của ghế này, vẽ riêng theo từng game. */
  token: React.ReactNode;
  active: boolean;
  thinking?: boolean;
  ms: number;
}

export interface MatchShellProps {
  title: string;
  subtitle: string;
  level: BotLevel;
  onLevel: (lv: BotLevel) => void;
  levelHints: Record<BotLevel, string>;
  onHome: () => void;
  onReset: () => void;
  onDraw: () => void;
  onResign: () => void;
  ended: Outcome | null;
  /** True nếu người cầm máy là bên thắng. */
  youWon: boolean;
  top: SeatBarProps;
  bottom: SeatBarProps;
  /** Mặt bàn của game, nhận kích thước khối giữa. */
  surface?: (w: number, h: number) => React.ReactNode;
  /** Một dòng nhắc trạng thái, ví dụ "bạn đang bị ép đi vào ô đỏ". */
  note?: string | null;
  /** Vàng cho gợi ý, đỏ son cho ràng buộc luật, mờ cho thông tin nền. */
  noteTone?: 'gold' | 'seal' | 'soft';
  hintsLeft: number;
  canHint: boolean;
  onHint: () => void;
  canUndo: boolean;
  onUndo: () => void;
  children: React.ReactNode;
}

export function MatchShell(p: MatchShellProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [picking, setPicking] = useState(false);
  const [midH, setMidH] = useState(0);

  return (
    <View style={{ flex: 1, paddingTop: insets.top + S.sm, paddingBottom: insets.bottom + S.sm }}>
      <AppBackdrop width={width} height={height} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingBottom: S.sm }}>
        <Pressable onPress={p.onHome} hitSlop={14} accessibilityRole="button" accessibilityLabel="Về sảnh">
          <Icon name="back" size={22} color={A.inkSoft} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Txt size={18} weight="display">
            {p.title}
          </Txt>
          <Txt size={10.5} color={A.inkFaint}>
            {p.subtitle}
          </Txt>
        </View>
        <Pressable
          onPress={() => setPicking(true)}
          accessibilityRole="button"
          accessibilityLabel="Đổi mức máy"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            minHeight: 34,
            paddingHorizontal: S.md,
            borderRadius: R.pill,
            backgroundColor: A.goldSoft,
            borderWidth: 1.2,
            borderColor: A.goldDeep,
          }}
        >
          <Icon name="robot" size={15} color={A.gold} />
          <Txt size={12} weight="bold" color={A.gold}>
            {LEVEL_NAME[p.level]}
          </Txt>
        </Pressable>
      </View>

      {/* Mặt bàn trải hết khối giữa, không chỉ sau bàn cờ. Nhờ vậy hai thanh
          người chơi thành hai tấm biển đặt trên bàn, và khoảng trống trên
          dưới thành mặt bàn chứ không còn là chỗ thừa. */}
      <View style={{ flex: 1, justifyContent: 'center', gap: S.sm }} onLayout={(e) => setMidH(e.nativeEvent.layout.height)}>
        {midH > 0 ? p.surface?.(width, midH) : null}
        <SeatBar {...p.top} />
        <View style={{ alignItems: 'center', paddingVertical: S.sm }}>{p.children}</View>
        <SeatBar {...p.bottom} />
      </View>

      {p.note ? (
        <View style={{ paddingHorizontal: S.lg, paddingTop: S.xs }}>
          <Txt size={12} color={p.noteTone === 'seal' ? A.sealLit : p.noteTone === 'soft' ? A.inkFaint : A.gold} center>
            {p.note}
          </Txt>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: S.sm, paddingHorizontal: S.lg, paddingTop: S.md }}>
        <IconBtn
          name="bulb"
          label={`Gợi ý ${p.hintsLeft}`}
          tone="gold"
          disabled={!p.canHint}
          onPress={p.onHint}
        />
        <IconBtn name="undo" label="Lùi lại" disabled={!p.canUndo} onPress={p.onUndo} />
        <IconBtn name="refresh" label="Ván mới" onPress={p.onReset} />
        <IconBtn name="draw" label="Cầu hoà" disabled={!!p.ended} onPress={p.onDraw} />
        <IconBtn name="flag" label="Xin thua" tone="seal" disabled={!!p.ended} onPress={p.onResign} />
      </View>

      {p.ended ? (
        <Result
          win={p.youWon}
          draw={p.ended.winner === null}
          reason={p.ended.reason}
          onAgain={p.onReset}
          onHome={p.onHome}
        />
      ) : null}

      {picking ? (
        <LevelSheet
          level={p.level}
          hints={p.levelHints}
          onPick={(lv) => {
            p.onLevel(lv);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      ) : null}
    </View>
  );
}

/** Thanh người chơi. Đồng hồ bên phải, to nhất trong thanh. */
function SeatBar({ name, sub, token, active, thinking, ms }: SeatBarProps) {
  return (
    <Panel
      radius={R.md}
      tone={active ? 2 : 1}
      seed={name.length * 9 + 5}
      hairline={false}
      style={[
        { marginHorizontal: S.md, borderWidth: 1.2, borderColor: active ? A.goldDeep : A.lineSoft },
        active ? glow(0.3, 12) : undefined,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.sm }}>
        {token}
        <View style={{ flex: 1 }}>
          <Txt size={15} weight="display" color={active ? A.ink : A.inkSoft}>
            {name}
          </Txt>
          <Txt size={10.5} color={A.inkFaint}>
            {thinking ? 'đang nghĩ…' : sub}
          </Txt>
        </View>
        {active && !thinking ? <Tag label="đang đi" color={A.gold} bg={A.goldSoft} /> : null}
        <Clock ms={ms} running={active} />
      </View>
    </Panel>
  );
}

/**
 * Kết quả trượt lên từ đáy chứ không che giữa màn — chỗ giữa là nơi có vệt
 * đánh dấu nước thắng, đúng thứ người vừa thắng muốn nhìn đầu tiên.
 */
function Result({
  win,
  draw,
  reason,
  onAgain,
  onHome,
}: {
  win: boolean;
  draw: boolean;
  reason: string;
  onAgain: () => void;
  onHome: () => void;
}) {
  const tint = draw ? A.info : win ? A.gold : A.sealLit;
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
      <Panel
        radius={0}
        tone={2}
        seed={61}
        hairline={false}
        style={[
          { borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, borderTopWidth: 2, borderTopColor: tint },
          lift(0.6, 30, -12),
        ]}
      >
        <View style={{ gap: S.sm, padding: S.lg, paddingBottom: S.xxl, alignItems: 'center' }}>
          <Txt size={27} weight="displayHeavy" color={tint} center>
            {draw ? 'Hoà' : win ? 'Bạn thắng' : 'Bạn thua'}
          </Txt>
          <Rule width={160} />
          <Txt size={13} color={A.inkSoft} center style={{ marginBottom: S.sm }}>
            {reason}
          </Txt>
          <View style={{ flexDirection: 'row', gap: S.sm, alignSelf: 'stretch' }}>
            <Btn label="Về sảnh" tone="ghost" onPress={onHome} style={{ flex: 1 }} />
            <Btn label="Ván mới" onPress={onAgain} style={{ flex: 1.4 }} />
          </View>
        </View>
      </Panel>
    </View>
  );
}

/**
 * Chọn mức máy tách khỏi màn chơi. Ba nút mức nằm thường trực dưới bàn cờ
 * vừa chiếm chỗ, vừa mời người chơi đổi mức giữa ván.
 */
function LevelSheet({
  level,
  hints,
  onPick,
  onClose,
}: {
  level: BotLevel;
  hints: Record<BotLevel, string>;
  onPick: (lv: BotLevel) => void;
  onClose: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel="Đóng"
      onPress={onClose}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(12,7,3,0.72)',
      }}
    >
      <Panel
        radius={0}
        tone={2}
        seed={83}
        hairline={false}
        style={{ borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, borderTopWidth: 1.4, borderTopColor: A.goldDeep }}
      >
        <View style={{ gap: S.sm, padding: S.lg, paddingBottom: S.xxl }}>
          <Txt size={17} weight="display" style={{ marginBottom: S.xs }}>
            Mức máy
          </Txt>
          {([1, 2, 3] as BotLevel[]).map((lv) => (
            <Pressable
              key={lv}
              accessibilityRole="button"
              onPress={() => onPick(lv)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: S.md,
                minHeight: 56,
                padding: S.md,
                borderRadius: R.md,
                backgroundColor: level === lv ? A.goldSoft : A.panelLo,
                borderWidth: 1.2,
                borderColor: level === lv ? A.gold : A.lineSoft,
              }}
            >
              <Icon name="robot" size={20} color={level === lv ? A.gold : A.inkFaint} />
              <View style={{ flex: 1 }}>
                <Txt size={14} weight="bold" color={level === lv ? A.gold : A.ink}>
                  {LEVEL_NAME[lv]}
                </Txt>
                <Txt size={11} color={A.inkFaint}>
                  {hints[lv]}
                </Txt>
              </View>
              {level === lv ? <Icon name="check" size={18} color={A.gold} /> : null}
            </Pressable>
          ))}
          <Txt size={11} color={A.inkFaint} style={{ marginTop: S.xs }}>
            Đổi mức có hiệu lực ngay ở nước kế tiếp của máy.
          </Txt>
        </View>
      </Panel>
    </Pressable>
  );
}
