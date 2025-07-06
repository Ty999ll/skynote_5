// Nicole & Tyrell: Authentication system - Week 1 & 3
// Started with basic JWT auth, added Firebase integration Week 3
// This was the trickiest part - syncing Firebase with our backend!
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, onAuthChange, logout as firebaseLogout, loginWithGoogle, handleRedirectResult } from '@/lib/firebase';
import { User as FirebaseUser } from 'firebase/auth';

interface User {
  id: number;
  username: string;
  email: string;
  displayName: string;
  bio?: string;
  avatar?: string;
  currentlyReading?: string;
  favoriteQuote?: string;
  isAdmin: boolean;
  points: number;
  followersCount: number;
  followingCount: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  registerAdmin: (data: AdminRegisterData) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  displayName: string;
  bio?: string;
}

interface AdminRegisterData {
  username: string;
  email: string;
  password: string;
  displayName: string;
  adminKey: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Nicole: Firebase auth state listener - Week 3 integration
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        // Sync Firebase user with our backend
        try {
          const idToken = await firebaseUser.getIdToken();
          const response = await fetch('/api/auth/firebase-sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
              firebaseUid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
              avatar: firebaseUser.photoURL
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
            setToken(data.token);
            localStorage.setItem('skynote_token', data.token);
            localStorage.setItem('skynote_user', JSON.stringify(data.user));
          }
        } catch (error) {
          console.error('Firebase sync error:', error);
        }
      } else {
        // Check for existing local auth as fallback
        const storedToken = localStorage.getItem('skynote_token');
        const storedUser = localStorage.getItem('skynote_user');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      }
      setIsLoading(false);
    });

    // Handle redirect result on page load
    handleRedirectResult().catch(console.error);

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('skynote_token', data.token);
    localStorage.setItem('skynote_user', JSON.stringify(data.user));
  };

  const register = async (registerData: RegisterData) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registerData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }

    const data = await response.json();
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('skynote_token', data.token);
    localStorage.setItem('skynote_user', JSON.stringify(data.user));
  };

  const registerAdmin = async (adminData: AdminRegisterData) => {
    const response = await fetch('/api/auth/register-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(adminData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Admin registration failed');
    }

    const data = await response.json();
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('skynote_token', data.token);
    localStorage.setItem('skynote_user', JSON.stringify(data.user));
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await firebaseLogout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('skynote_token');
    localStorage.removeItem('skynote_user');
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    loginWithGoogle: handleGoogleLogin,
    register,
    registerAdmin,
    logout,
    isLoading,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
