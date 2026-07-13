import * as SecureStore from "expo-secure-store";
const SESSION_KEY = "cuido_session";
const loadSession = () => SecureStore.getItemAsync(SESSION_KEY);
const saveSession = (value) => SecureStore.setItemAsync(SESSION_KEY, value);
const clearSession = () => SecureStore.deleteItemAsync(SESSION_KEY);
export {
  clearSession,
  loadSession,
  saveSession
};
