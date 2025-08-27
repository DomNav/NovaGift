let _token: string | null = null;

export function setSessionToken(t: string) { 
  _token = t; 
}

export function getSessionToken(): string | null { 
  return _token; 
}

export function authHeaders() {
  const t = getSessionToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}