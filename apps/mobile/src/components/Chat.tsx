import React, { useCallback, useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Txt } from './ui';
import { Icon } from './Icon';
import { StickerArt, StickerName } from './Piece';
import { API_URL, api, friendlyError } from '../lib/api';
import { C, F, R, S, softShadow } from '../theme';
import { useBubbleStyle, useEmotePack } from './Cosmetic';

/**
 * Phần dùng chung của hai màn chat (1-1 và chat bang). Trước đây hai màn chép
 * gần như nguyên xi của nhau, nên sửa một chỗ là quên chỗ kia.
 */

/** Sticker vẽ bằng asset, không dùng ký tự emoji — emoji mỗi máy vẽ một kiểu. */
const STICKERS: StickerName[] = ['happy', 'sad', 'love', 'fire', 'win', 'draw', 'crown', 'star', 'gem', 'paw', 'skull'];

const STICKER_RE = /^:[a-z0-9-]+:$/;

/** Đường dẫn ảnh do server phát ra; khớp với IMAGE_PATH_RE bên server. */
const IMAGE_RE = /^\/uploads\/[a-z0-9]{8,32}\.(png|jpg|webp|gif)$/;

export function imageUrlOf(body: string): string | null {
  return IMAGE_RE.test(body) ? `${API_URL}${body}` : null;
}

/* ------------------------------- bong bóng ------------------------------ */

export function MessageBody({
  message,
  mine,
  bubbleText,
  onOpenImage,
}: {
  message: any;
  mine: boolean;
  bubbleText?: string;
  onOpenImage: (url: string) => void;
}) {
  const img = message.kind === 'image' ? imageUrlOf(message.body) : null;
  if (img) {
    return (
      <Pressable onPress={() => onOpenImage(img)} accessibilityLabel="Xem ảnh">
        <Image
          source={{ uri: img }}
          // Khung cố định: ảnh chưa tải xong mà khung co giãn thì cả danh sách
          // tin nhắn nhảy loạn.
          style={{ width: 200, height: 200, borderRadius: R.md, backgroundColor: C.surfaceAlt }}
          resizeMode="cover"
        />
      </Pressable>
    );
  }
  if (STICKER_RE.test(message.body)) {
    return <StickerArt name={message.body.slice(1, -1) as StickerName} size={48} />;
  }
  return (
    <Txt size={14} color={mine ? bubbleText ?? '#fff' : C.ink}>
      {message.body}
    </Txt>
  );
}

/** Ảnh phóng to, chạm ra ngoài là đóng. */
export function ImageLightbox({ url, onClose }: { url: string | null; onClose: () => void }) {
  return (
    <Modal visible={!!url} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.86)', alignItems: 'center', justifyContent: 'center', padding: S.lg }}
      >
        {url ? <Image source={{ uri: url }} style={{ width: '100%', height: '80%' }} resizeMode="contain" /> : null}
        <Txt size={12} color="rgba(255,255,255,0.7)" style={{ marginTop: S.md }}>
          Chạm để đóng
        </Txt>
      </Pressable>
    </Modal>
  );
}

/* -------------------------------- ô soạn -------------------------------- */

export function ChatComposer({
  placeholder,
  onSend,
  onError,
}: {
  placeholder: string;
  onSend: (body: string, kind: 'text' | 'sticker' | 'image') => void | Promise<void>;
  onError: (text: string) => void;
}) {
  const [draft, setDraft] = useState('');
  /**
   * Trước đây dải sticker luôn nằm chình ình trên bàn phím, ăn mất một hàng
   * màn hình mà phần lớn thời gian không ai dùng. Giờ gom vào một nút, bấm mới mở.
   */
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const pack = useEmotePack();
  const stickers = useMemo(
    () => [...STICKERS, ...pack.filter((x) => !STICKERS.includes(x as StickerName))] as StickerName[],
    [pack],
  );

  const sendText = () => {
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    void onSend(body, 'text');
  };

  const pickImage = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return onError('Cần quyền truy cập ảnh để gửi ảnh');
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        // Nén trước khi gửi: ảnh gốc của máy ảnh thường vài MB, quá trần server.
        quality: 0.7,
        base64: true,
      });
      if (res.canceled || !res.assets?.length) return;
      const asset = res.assets[0];
      const data = asset.base64
        ? `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`
        : asset.uri;
      setBusy(true);
      const up = await api<{ url: string }>('/api/social/upload', { method: 'POST', body: { data } });
      await onSend(up.url, 'image');
    } catch (e: any) {
      onError(friendlyError(e?.code ?? 'NETWORK'));
    } finally {
      setBusy(false);
    }
  }, [onSend, onError]);

  return (
    <View>
      {/* Bảng chọn sticker: chỉ hiện khi bấm nút mặt cười */}
      {pickerOpen ? (
        <View
          style={[
            {
              backgroundColor: C.surface,
              borderTopWidth: 2,
              borderColor: C.line,
              paddingHorizontal: S.lg,
              paddingTop: S.md,
              paddingBottom: S.sm,
              gap: S.sm,
            },
            softShadow(0.08, 12, -4),
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Txt size={12} weight="bold" color={C.inkSoft} style={{ flex: 1 }}>
              Sticker
            </Txt>
            <Pressable onPress={() => setPickerOpen(false)} hitSlop={10}>
              <Icon name="close" size={16} color={C.inkFaint} />
            </Pressable>
          </View>
          {/* Ba hàng vừa đủ cho bộ sticker mặc định + gói emote; cắt thấp hơn
              thì hàng cuối bị xén ngang, nhìn như lỗi bố cục. */}
          <ScrollView style={{ maxHeight: 210 }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md }}>
            {stickers.map((s) => (
              <Pressable
                key={s}
                onPress={() => {
                  setPickerOpen(false);
                  void onSend(`:${s}:`, 'sticker');
                }}
                accessibilityLabel={`Gửi sticker ${s}`}
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: R.md,
                  backgroundColor: C.surfaceAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <StickerArt name={s} size={34} />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          gap: 6,
          padding: S.md,
          alignItems: 'center',
          backgroundColor: C.surface,
          borderTopWidth: pickerOpen ? 0 : 2,
          borderColor: C.line,
        }}
      >
        <ComposerButton
          icon="happy-face"
          active={pickerOpen}
          label="Chọn sticker"
          onPress={() => setPickerOpen((v) => !v)}
        />
        <ComposerButton icon="image" label="Gửi ảnh" busy={busy} onPress={pickImage} />
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={sendText}
          onFocus={() => setPickerOpen(false)}
          placeholder={placeholder}
          placeholderTextColor={C.inkFaint}
          style={{
            flex: 1,
            backgroundColor: C.bg,
            borderRadius: R.pill,
            paddingHorizontal: 14,
            paddingVertical: 10,
            fontFamily: F.body,
            fontSize: 14,
            color: C.ink,
          }}
        />
        <Pressable
          onPress={sendText}
          disabled={!draft.trim()}
          accessibilityLabel="Gửi tin nhắn"
          style={[
            {
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: draft.trim() ? C.primary : C.surfaceAlt,
            },
            draft.trim() ? softShadow(0.16, 8, 3) : null,
          ]}
        >
          <Icon name="send" size={18} color={draft.trim() ? '#fff' : C.inkFaint} strokeWidth={2.2} />
        </Pressable>
      </View>
    </View>
  );
}

function ComposerButton({
  icon,
  label,
  onPress,
  active,
  busy,
}: {
  icon: 'happy-face' | 'image';
  label: string;
  onPress: () => void;
  active?: boolean;
  busy?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityLabel={label}
      style={{
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: active ? C.primarySoft : 'transparent',
        opacity: busy ? 0.5 : 1,
      }}
    >
      <Icon
        name={icon === 'image' ? 'image' : 'happy-face'}
        size={22}
        color={active ? C.primaryDark : C.inkSoft}
        strokeWidth={2}
      />
    </Pressable>
  );
}
