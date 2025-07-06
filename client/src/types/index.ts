// User types
export interface User {
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
  createdAt: string;
}

export interface InsertUser {
  username: string;
  email: string;
  password: string;
  displayName: string;
  bio?: string;
}

// Book types
export interface Book {
  id?: number;
  title: string;
  author: string;
  isbn?: string;
  coverUrl?: string;
  description?: string;
  openLibraryKey?: string;
  averageRating?: string;
  ratingsCount?: number;
  createdAt?: string;
}

export interface InsertBook {
  title: string;
  author: string;
  isbn?: string;
  coverUrl?: string;
  description?: string;
  openLibraryKey?: string;
  averageRating?: string;
}

// Post types
export interface Post {
  id: number;
  userId: number;
  bookId?: number;
  type: 'review' | 'fanart' | 'post' | 'quote';
  title?: string;
  content: string;
  imageUrl?: string;
  rating?: number;
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  isApproved: boolean;
  createdAt: string;
  user?: User;
  book?: Book;
}

export interface InsertPost {
  bookId?: number;
  type: 'review' | 'fanart' | 'post' | 'quote';
  title?: string;
  content: string;
  imageUrl?: string;
  rating?: number;
}

// Achievement types
export interface Achievement {
  id: number;
  name: string;
  description: string;
  category: string;
  icon: string;
  points: number;
  requirement: any;
  isActive: boolean;
  progress?: number;
  isUnlocked?: boolean;
  unlockedAt?: string | null;
}

export interface UserAchievement {
  id: number;
  userId: number;
  achievementId: number;
  progress: number;
  isUnlocked: boolean;
  unlockedAt?: string | null;
  createdAt: string;
}

// Social types
export interface Follow {
  id: number;
  followerId: number;
  followedId: number;
  createdAt: string;
}

export interface Like {
  id: number;
  userId: number;
  postId: number;
  createdAt: string;
}

export interface Repost {
  id: number;
  userId: number;
  postId: number;
  comment?: string;
  createdAt: string;
}

// Book log types
export interface BookLog {
  id: number;
  userId: number;
  bookId: number;
  status: 'reading' | 'finished' | 'want-to-read';
  progress: number;
  startDate?: string;
  finishDate?: string;
  rating?: number;
  createdAt: string;
  book?: Book;
}

// Notification types
export interface Notification {
  id: number;
  userId: number;
  type: 'like' | 'follow' | 'comment' | 'achievement';
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
}

// Content report types
export interface ContentReport {
  id: number;
  reporterId?: number;
  postId: number;
  reason: string;
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved';
  reviewedBy?: number;
  createdAt: string;
}

// Guest session types
export interface GuestSession {
  id: number;
  sessionId: string;
  preferences: any;
  viewedContent: string[];
  createdAt: string;
  lastActiveAt: string;
}

// Analytics types
export interface UserStats {
  postsCount: number;
  booksRead: number;
  achievementsUnlocked: number;
  totalPoints: number;
  followersCount: number;
  followingCount: number;
  reviewsWritten: number;
}

// API response types
export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Form types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  displayName: string;
  bio?: string;
}

export interface CreatePostFormData {
  type: 'review' | 'fanart' | 'post' | 'quote';
  title?: string;
  content: string;
  bookId?: number;
  rating?: number;
}

// Search types
export interface SearchFilters {
  query?: string;
  type?: 'books' | 'users' | 'posts';
  category?: string;
  sortBy?: 'relevance' | 'date' | 'popularity';
  limit?: number;
  offset?: number;
}

// Theme types
export interface ThemePreferences {
  mode: 'light' | 'dark';
  primaryColor?: string;
  fontSize?: 'small' | 'medium' | 'large';
}

// App state types
export interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  theme: ThemePreferences;
  notifications: Notification[];
  unreadCount: number;
}
