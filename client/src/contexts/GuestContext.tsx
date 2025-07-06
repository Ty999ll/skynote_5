import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface GuestSession {
  id: number;
  sessionId: string;
  preferences: any;
  viewedContent: string[];
  createdAt: Date;
  lastActiveAt: Date;
}

interface GuestContextType {
  session: GuestSession | null;
  createSession: () => Promise<void>;
  updatePreferences: (preferences: any) => Promise<void>;
  addViewedContent: (contentId: string) => Promise<void>;
  isGuest: boolean;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

export const useGuest = () => {
  const context = useContext(GuestContext);
  if (context === undefined) {
    throw new Error('useGuest must be used within a GuestProvider');
  }
  return context;
};

interface GuestProviderProps {
  children: ReactNode;
}

export const GuestProvider: React.FC<GuestProviderProps> = ({ children }) => {
  const [session, setSession] = useState<GuestSession | null>(null);

  useEffect(() => {
    const storedSessionId = localStorage.getItem('skynote_guest_session');
    if (storedSessionId) {
      fetchSession(storedSessionId);
    } else {
      createSession();
    }
  }, []);

  const fetchSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/guest/session/${sessionId}`);
      if (response.ok) {
        const sessionData = await response.json();
        setSession(sessionData);
      } else {
        createSession();
      }
    } catch (error) {
      console.error('Failed to fetch guest session:', error);
      createSession();
    }
  };

  const createSession = async () => {
    try {
      const response = await fetch('/api/guest/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferences: {
            theme: 'light',
            feedType: 'for-you',
          },
        }),
      });

      if (response.ok) {
        const sessionData = await response.json();
        setSession(sessionData);
        localStorage.setItem('skynote_guest_session', sessionData.sessionId);
      }
    } catch (error) {
      console.error('Failed to create guest session:', error);
    }
  };

  const updatePreferences = async (preferences: any) => {
    if (!session) return;

    try {
      const response = await fetch(`/api/guest/session/${session.sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferences }),
      });

      if (response.ok) {
        const updatedSession = await response.json();
        setSession(updatedSession);
      }
    } catch (error) {
      console.error('Failed to update guest preferences:', error);
    }
  };

  const addViewedContent = async (contentId: string) => {
    if (!session) return;

    const updatedViewedContent = [...(session.viewedContent || []), contentId];

    try {
      const response = await fetch(`/api/guest/session/${session.sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ viewedContent: updatedViewedContent }),
      });

      if (response.ok) {
        const updatedSession = await response.json();
        setSession(updatedSession);
      }
    } catch (error) {
      console.error('Failed to update viewed content:', error);
    }
  };

  const value: GuestContextType = {
    session,
    createSession,
    updatePreferences,
    addViewedContent,
    isGuest: !!session,
  };

  return (
    <GuestContext.Provider value={value}>
      {children}
    </GuestContext.Provider>
  );
};
