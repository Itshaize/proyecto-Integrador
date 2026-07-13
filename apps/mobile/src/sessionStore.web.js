const SESSION_KEY = "cuido_session";
const loadSession = async () => localStorage.getItem(SESSION_KEY);
const saveSession = async (value) => localStorage.setItem(SESSION_KEY, value);
const clearSession = async () => localStorage.removeItem(SESSION_KEY);
export {
  clearSession,
  loadSession,
  saveSession
};
