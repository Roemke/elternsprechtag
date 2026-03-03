export function authFetch(url, options = {}) {
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}),
      ...options.headers,
    },
  })
}
export function formatTime(time) {
  if (!time) return ''
  return time.substring(0, 5) // '15:30:00' → '15:30'
}
