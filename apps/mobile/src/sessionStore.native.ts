import * as SecureStore from "expo-secure-store";

const SESSION_KEY = "cuido_session";

export const loadSession = () => SecureStore.getItemAsync(SESSION_KEY);
export const saveSession = (value: string) =>
  SecureStore.setItemAsync(SESSION_KEY, value);
export const clearSession = () => SecureStore.deleteItemAsync(SESSION_KEY);
