export type Theme = 'light' | 'dark'

const KEY = 'mama7k.theme'

export function getTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#10131A' : '#FFFFFF')
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // storage unavailable – theme still applies for this visit
  }
}
