import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import type { ChatLine } from '@co/protocol';
import { live, useLive } from '../net/live';
import { Icon } from './Icon';
import { Btn, Panel, SLOP, Txt, press } from './parts';
import { A, R, S } from './theme';

/**
 * Khung nhắn tin, dùng chung cho mọi kênh.
 *
 * Một bộ phận cho cả nhắn riêng, sảnh chung, chat trong phòng và thông báo
 * hệ thống. Bốn nơi đó khác nhau ở **tên kênh** và ở chỗ được đặt vào, không
 * khác nhau ở cách hiện một dòng tin — nên viết bốn lần là ba lần sẽ lệch.
 */

export function ChatPanel({ channel, meId, readOnly }: { channel: string; meId: string; readOnly?: boolean }) {
  const s = useLive();
  const [draft, setDraft] = useState('');
  const scroller = useRef<ScrollView>(null);
  const atBottom = useRef(true);
  const rows = s.chat.channel === channel ? s.chat.rows : [];

  useEffect(() => {
    live.openChat(channel);
    return () => live.closeChat();
  }, [channel]);

  // Chỉ tự cuộn khi người ta **đang ở đáy**. Kéo lên đọc lại tin cũ mà mỗi
  // tin mới lại giật xuống đáy thì không đọc nổi.
  useEffect(() => {
    if (atBottom.current) scroller.current?.scrollToEnd({ animated: true });
  }, [rows.length]);

  const last = rows[rows.length - 1];
  useEffect(() => {
    if (last) live.readChat(channel, last.id);
  }, [channel, last?.id]);

  const send = useCallback(() => {
    const body = draft.trim();
    if (!body) return;
    live.sendChat(channel, body);
    setDraft('');
  }, [draft, channel]);

  return (
    <View style={{ flex: 1, gap: S.sm }}>
      <ScrollView
        ref={scroller}
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 2, paddingVertical: S.sm }}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={64}
        onScroll={(e) => {
          const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
          atBottom.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - 40;
        }}
      >
        {s.chat.more ? (
          <Pressable
            onPress={() => rows[0] && live.moreChat(channel, rows[0].id)}
            accessibilityRole="button"
            accessibilityLabel="Xem tin cũ hơn"
            hitSlop={SLOP}
            style={({ pressed }) => [{ alignSelf: 'center', paddingVertical: S.md, paddingHorizontal: S.lg }, press({ pressed })]}
          >
            <Txt size={11.5} color={A.gold}>
              Xem tin cũ hơn
            </Txt>
          </Pressable>
        ) : null}

        {rows.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: S.xl }}>
            <Txt size={12} color={A.inkFaint} center>
              Chưa có tin nào. Gõ một câu để bắt đầu.
            </Txt>
          </View>
        ) : null}

        {rows.map((m, i) => (
          <React.Fragment key={m.id}>
            {sameDay(rows[i - 1]?.at, m.at) ? null : <DayMark at={m.at} />}
            <Line m={m} mine={m.fromId === meId} first={rows[i - 1]?.fromId !== m.fromId || !sameDay(rows[i - 1]?.at, m.at)} />
          </React.Fragment>
        ))}
      </ScrollView>

      {readOnly ? (
        <Panel radius={R.md} tone={0} seed={19}>
          <View style={{ flexDirection: 'row', gap: S.sm, alignItems: 'center', padding: S.md }}>
            <Icon name="lock" size={14} color={A.inkFaint} />
            <Txt size={11.5} color={A.inkFaint} style={{ flex: 1 }}>
              Kênh này chỉ để đọc.
            </Txt>
          </View>
        </Panel>
      ) : (
        <View style={{ flexDirection: 'row', gap: S.sm, alignItems: 'flex-end' }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Nhắn gì đó…"
            placeholderTextColor={A.inkFaint}
            accessibilityLabel="Ô nhắn tin"
            multiline
            onSubmitEditing={send}
            blurOnSubmit={false}
            maxLength={1000}
            style={{
              flex: 1,
              maxHeight: 96,
              borderWidth: 1.3,
              borderColor: A.line,
              backgroundColor: A.panelLo,
              borderRadius: R.md,
              color: A.ink,
              fontSize: 14.5,
              paddingHorizontal: S.md,
              paddingVertical: 10,
            }}
          />
          <Btn label="Gửi" size="md" disabled={!draft.trim()} onPress={send} style={{ minWidth: 76 }} />
        </View>
      )}
    </View>
  );
}

const sameDay = (a: number | undefined, b: number): boolean => {
  if (a === undefined) return false;
  const x = new Date(a);
  const y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
};

/**
 * Vạch ngày.
 *
 * Không có nó thì một cuộc trò chuyện kéo dài ba tuần đọc như một khối liền
 * mạch: "7 giờ tối" ở dòng trên và "9 giờ sáng" ở dòng dưới cách nhau đúng
 * mười ngày mà nhìn ra y như cách nhau mười bốn tiếng.
 */
function DayMark({ at }: { at: number }) {
  const d = new Date(at);
  const now = new Date();
  const days = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86_400_000);
  const label =
    days === 0 ? 'Hôm nay' : days === 1 ? 'Hôm qua' : days < 7 ? `${days} ngày trước` : d.toLocaleDateString('vi-VN');
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingVertical: S.md }}>
      <View style={{ flex: 1, height: 1, backgroundColor: A.lineSoft }} />
      <Txt size={11} color={A.inkFaint}>
        {label}
      </Txt>
      <View style={{ flex: 1, height: 1, backgroundColor: A.lineSoft }} />
    </View>
  );
}

/**
 * Một dòng tin.
 *
 * `first` là tin đầu của một chuỗi cùng người gửi — chỉ dòng đó mới hiện tên.
 * Lặp tên ở cả năm tin liên tiếp là năm lần nói cùng một điều, và nó đẩy nội
 * dung thật xuống.
 */
function Line({ m, mine, first }: { m: ChatLine; mine: boolean; first: boolean }) {
  const system = m.fromId === null;
  if (system) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 6 }}>
        <View style={{ maxWidth: '92%', borderRadius: R.sm, backgroundColor: A.goldSoft, paddingHorizontal: S.md, paddingVertical: 6 }}>
          <Txt size={11.5} color={A.gold} center>
            {m.body}
          </Txt>
        </View>
      </View>
    );
  }
  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', paddingTop: first ? 8 : 1 }}>
      {first && !mine ? (
        <Txt size={11} color={A.inkFaint} style={{ paddingLeft: 4, paddingBottom: 2 }}>
          {m.fromName}
        </Txt>
      ) : null}
      <View
        style={{
          maxWidth: '82%',
          borderRadius: 14,
          backgroundColor: mine ? A.goldSoft : A.panelHi,
          borderWidth: 1,
          borderColor: mine ? A.goldDeep : A.lineSoft,
          paddingHorizontal: S.md,
          paddingVertical: 8,
        }}
      >
        <Txt size={14} color={A.ink}>
          {m.body}
        </Txt>
        <Txt size={11} color={A.inkFaint} style={{ alignSelf: 'flex-end', paddingTop: 2 }}>
          {new Date(m.at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </Txt>
      </View>
    </View>
  );
}
