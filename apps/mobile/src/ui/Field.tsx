import React from 'react';
import { TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { Txt } from './parts';
import { A, R, S } from './theme';

/**
 * Ô nhập có **nhãn hiện thường trực**, không phải nhãn giả trong placeholder.
 *
 * Placeholder biến mất ngay khi gõ ký tự đầu, nên người điền tới ô thứ ba là
 * quên ô thứ nhất hỏi gì. Đây là lỗi hay gặp nhất trong biểu mẫu đăng ký.
 */
export function Field({
  label,
  value,
  onChange,
  placeholder,
  secure,
  keyboard,
  autoComplete,
  hint,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  secure?: boolean;
  keyboard?: KeyboardTypeOptions;
  autoComplete?: 'email' | 'password' | 'new-password' | 'name' | 'off';
  hint?: string;
  error?: boolean;
}) {
  return (
    <View style={{ gap: 5 }}>
      <Txt size={11.5} weight="semi" color={A.inkSoft}>
        {label}
      </Txt>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={A.inkFaint}
        secureTextEntry={secure}
        keyboardType={keyboard}
        autoComplete={autoComplete}
        autoCapitalize={keyboard === 'email-address' ? 'none' : 'sentences'}
        autoCorrect={false}
        accessibilityLabel={label}
        style={{
          borderWidth: 1.3,
          borderColor: error ? A.seal : A.line,
          backgroundColor: A.panelLo,
          borderRadius: R.md,
          color: A.ink,
          fontSize: 15,
          paddingHorizontal: S.md,
          paddingVertical: 11,
        }}
      />
      {hint ? (
        <Txt size={10.5} color={A.inkFaint}>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}
