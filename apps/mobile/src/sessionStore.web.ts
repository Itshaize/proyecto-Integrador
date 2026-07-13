const SESSION_KEY = "cuido_session";

export const loadSession = async () => localStorage.getItem(SESSION_KEY);
export const saveSession = async (value: string) =>
  localStorage.setItem(SESSION_KEY, value);
export const clearSession = async () => localStorage.removeItem(SESSION_KEY);
