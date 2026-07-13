import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius } from "./theme";
function Brand({ compact = false }) {
  return /* @__PURE__ */ React.createElement(View, { style: styles.brand }, /* @__PURE__ */ React.createElement(View, { style: [styles.mark, compact && { width: 36, height: 36, borderRadius: 12 }] }, /* @__PURE__ */ React.createElement(View, { style: styles.markDot }), /* @__PURE__ */ React.createElement(Ionicons, { name: "shield-checkmark-outline", size: compact ? 21 : 28, color: colors.teal })), /* @__PURE__ */ React.createElement(Text, { style: [styles.brandText, compact && { fontSize: 20 }] }, "Cuido", /* @__PURE__ */ React.createElement(Text, { style: { color: colors.teal } }, "+")));
}
function Button({ title, onPress, icon, variant = "primary", disabled = false, loading = false, style }) {
  return /* @__PURE__ */ React.createElement(Pressable, { accessibilityRole: "button", accessibilityLabel: title, disabled: disabled || loading, onPress, style: ({ pressed }) => [styles.button, styles[`button_${variant}`], (disabled || loading) && styles.disabled, pressed && styles.pressed, style] }, loading ? /* @__PURE__ */ React.createElement(ActivityIndicator, { color: variant === "primary" ? colors.canvas : colors.text }) : /* @__PURE__ */ React.createElement(React.Fragment, null, icon && /* @__PURE__ */ React.createElement(Ionicons, { name: icon, size: 21, color: variant === "primary" ? colors.canvas : colors.text }), /* @__PURE__ */ React.createElement(Text, { style: [styles.buttonText, variant === "primary" && { color: colors.canvas }] }, title)));
}
function Field({ label, error, hint, icon, ...props }) {
  return /* @__PURE__ */ React.createElement(View, { style: styles.field }, /* @__PURE__ */ React.createElement(Text, { style: styles.label }, label), /* @__PURE__ */ React.createElement(View, { style: [styles.inputWrap, !!error && styles.inputError] }, !!icon && /* @__PURE__ */ React.createElement(Ionicons, { name: icon, size: 20, color: error ? colors.danger : colors.muted }), /* @__PURE__ */ React.createElement(TextInput, { accessibilityLabel: label, placeholderTextColor: colors.subtle, style: styles.input, ...props })), error ? /* @__PURE__ */ React.createElement(Text, { style: styles.error }, error) : hint ? /* @__PURE__ */ React.createElement(Text, { style: styles.hint }, hint) : null);
}
function Header({ title, onBack, action }) {
  return /* @__PURE__ */ React.createElement(View, { style: styles.header }, onBack ? /* @__PURE__ */ React.createElement(Pressable, { accessibilityRole: "button", accessibilityLabel: "Volver", onPress: onBack, hitSlop: 12, style: styles.iconButton }, /* @__PURE__ */ React.createElement(Ionicons, { name: "arrow-back", size: 24, color: colors.text })) : /* @__PURE__ */ React.createElement(Brand, { compact: true }), /* @__PURE__ */ React.createElement(Text, { numberOfLines: 1, style: styles.headerTitle }, title), action ?? /* @__PURE__ */ React.createElement(View, { style: { width: 44 } }));
}
function Notice({ message, type = "info" }) {
  const icon = type === "error" ? "alert-circle" : type === "success" ? "checkmark-circle" : "information-circle";
  return /* @__PURE__ */ React.createElement(View, { accessibilityRole: "alert", style: [styles.notice, type === "error" && styles.noticeError, type === "success" && styles.noticeSuccess] }, /* @__PURE__ */ React.createElement(Ionicons, { name: icon, size: 20, color: type === "error" ? colors.danger : colors.teal }), /* @__PURE__ */ React.createElement(Text, { style: styles.noticeText }, message));
}
function Skeleton() {
  return /* @__PURE__ */ React.createElement(View, { style: styles.skeleton }, /* @__PURE__ */ React.createElement(View, { style: styles.skeletonLine }), /* @__PURE__ */ React.createElement(View, { style: [styles.skeletonLine, { width: "58%" }] }));
}
function ConfirmDialog({ visible, title, message, confirmLabel = "Confirmar", confirmVariant = "danger", onConfirm, onCancel }) {
  if (!visible) return null;
  return /* @__PURE__ */ React.createElement(View, { style: styles.overlay }, /* @__PURE__ */ React.createElement(View, { style: styles.dialog }, /* @__PURE__ */ React.createElement(View, { style: styles.dialogIcon }, /* @__PURE__ */ React.createElement(Ionicons, { name: confirmVariant === "danger" ? "warning-outline" : "help-circle-outline", size: 28, color: confirmVariant === "danger" ? colors.danger : colors.teal })), /* @__PURE__ */ React.createElement(Text, { style: styles.dialogTitle }, title), !!message && /* @__PURE__ */ React.createElement(Text, { style: styles.dialogMessage }, message), /* @__PURE__ */ React.createElement(View, { style: styles.dialogActions }, /* @__PURE__ */ React.createElement(Pressable, { onPress: onCancel, style: ({ pressed }) => [styles.dialogBtn, styles.dialogBtnCancel, pressed && styles.pressed] }, /* @__PURE__ */ React.createElement(Text, { style: styles.dialogBtnCancelText }, "Cancelar")), /* @__PURE__ */ React.createElement(Pressable, { onPress: onConfirm, style: ({ pressed }) => [styles.dialogBtn, confirmVariant === "danger" ? styles.dialogBtnDanger : styles.dialogBtnPrimary, pressed && styles.pressed] }, /* @__PURE__ */ React.createElement(Text, { style: styles.dialogBtnConfirmText }, confirmLabel)))));
}
function useConfirm() {
  const { useState, useCallback } = React;
  const [state, setState] = useState({ visible: false, title: "", message: "", confirmLabel: "Confirmar", confirmVariant: "danger", onConfirm: null });
  const show = useCallback(({ title, message, confirmLabel, confirmVariant, onConfirm }) => {
    setState({ visible: true, title, message: message || "", confirmLabel: confirmLabel || "Confirmar", confirmVariant: confirmVariant || "danger", onConfirm });
  }, []);
  const hide = useCallback(() => setState((s) => ({ ...s, visible: false })), []);
  const dialog = /* @__PURE__ */ React.createElement(ConfirmDialog, { visible: state.visible, title: state.title, message: state.message, confirmLabel: state.confirmLabel, confirmVariant: state.confirmVariant, onCancel: hide, onConfirm: () => { hide(); state.onConfirm && state.onConfirm(); } });
  return { show, dialog };
}
const styles = StyleSheet.create({
  brand: { flexDirection: "row", alignItems: "center", gap: 11 },
  mark: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.tealSoft, borderWidth: 1, borderColor: colors.tealDeep, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  markDot: { position: "absolute", width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(39,199,184,.12)" },
  brandText: { color: colors.text, fontFamily: fonts.bold, fontSize: 26, letterSpacing: -0.8 },
  button: { minHeight: 54, borderRadius: radius.input, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, borderWidth: 1, borderColor: "transparent" },
  button_primary: { backgroundColor: colors.teal },
  button_secondary: { backgroundColor: colors.elevated, borderColor: colors.line },
  button_danger: { backgroundColor: colors.danger },
  button_ghost: { backgroundColor: "transparent" },
  buttonText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 16 },
  disabled: { opacity: 0.38 },
  pressed: { transform: [{ scale: 0.98 }] },
  field: { gap: 8 },
  label: { fontFamily: fonts.medium, color: colors.text, fontSize: 15 },
  inputWrap: { minHeight: 54, borderRadius: radius.input, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10 },
  input: { flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 16, paddingVertical: 14 },
  inputError: { borderColor: colors.danger },
  error: { color: "#FF8392", fontFamily: fonts.regular, fontSize: 13 },
  hint: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13 },
  header: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: 12 },
  headerTitle: { flex: 1, color: colors.text, fontFamily: fonts.semibold, fontSize: 19 },
  iconButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line },
  notice: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 14, backgroundColor: colors.tealSoft, borderWidth: 1, borderColor: colors.tealDeep },
  noticeError: { backgroundColor: "#2B141B", borderColor: "#672131" },
  noticeSuccess: { backgroundColor: colors.tealSoft },
  noticeText: { flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  skeleton: { height: 92, borderRadius: radius.card, backgroundColor: colors.surface, padding: 20, gap: 12 },
  skeletonLine: { height: 12, borderRadius: 6, backgroundColor: colors.elevated, width: "78%" },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.72)", alignItems: "center", justifyContent: "center", zIndex: 9999 },
  dialog: { width: "85%", maxWidth: 360, backgroundColor: colors.surface, borderRadius: 22, padding: 24, gap: 14, borderWidth: 1, borderColor: colors.line, shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 8 } },
  dialogIcon: { alignItems: "center", marginBottom: 4 },
  dialogTitle: { fontFamily: fonts.bold, color: colors.text, fontSize: 18, textAlign: "center" },
  dialogMessage: { fontFamily: fonts.regular, color: colors.muted, fontSize: 14, textAlign: "center", lineHeight: 21 },
  dialogActions: { flexDirection: "row", gap: 10, marginTop: 6 },
  dialogBtn: { flex: 1, minHeight: 46, borderRadius: 13, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  dialogBtnCancel: { backgroundColor: colors.elevated, borderColor: colors.line },
  dialogBtnCancelText: { fontFamily: fonts.semibold, color: colors.text, fontSize: 15 },
  dialogBtnDanger: { backgroundColor: colors.danger, borderColor: "#FF6B7C" },
  dialogBtnPrimary: { backgroundColor: colors.teal, borderColor: colors.teal },
  dialogBtnConfirmText: { fontFamily: fonts.semibold, color: "#fff", fontSize: 15 }
});
export {
  Brand,
  Button,
  ConfirmDialog,
  Field,
  Header,
  Notice,
  Skeleton,
  useConfirm
};
