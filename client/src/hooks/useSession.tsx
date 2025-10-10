import { useEffect, useState } from 'react';

function generateSessionId(): string {
  return 'session_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function useSession() {
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    // Get or create session ID
    let id = localStorage.getItem('tiger_session_id');
    if (!id) {
      id = generateSessionId();
      localStorage.setItem('tiger_session_id', id);
    }
    setSessionId(id);
  }, []);

  return { sessionId };
}
