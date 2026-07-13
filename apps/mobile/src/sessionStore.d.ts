export function loadSession(): Promise<string | null>;
export function saveSession(value: string): Promise<void>;
export function clearSession(): Promise<void>;
