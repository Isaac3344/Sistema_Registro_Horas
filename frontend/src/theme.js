const KEY = "app_registro_theme_v1";

export function loadTheme() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { primary: "#2563eb", surface: "#0b1220", text: "#e5e7eb", accent: "#22c55e" };
    return JSON.parse(raw);
  } catch {
    return { primary: "#2563eb", surface: "#0b1220", text: "#e5e7eb", accent: "#22c55e" };
  }
}

export function saveTheme(theme) {
  localStorage.setItem(KEY, JSON.stringify(theme));
}

export function applyTheme(theme) {
  const r = document.documentElement;
  r.style.setProperty("--primary", theme.primary);
  r.style.setProperty("--surface", theme.surface);
  r.style.setProperty("--text", theme.text);
  r.style.setProperty("--accent", theme.accent);
}
