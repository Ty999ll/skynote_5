/**
 * 
 * This file handles all the main API endpoints for our social reading platform.
 * We spent countless hours debugging authentication middleware and getting 
 * the JWT tokens to work properly across all routes.
 */

import { type Express, type Request, type Response, type NextFunction, query } from "express";
import { createServer, type Server } from "http";
import session from 'express-session';
import passport from './passport';
import { emailService } from './email-config';
import { configureGoogleAuth, setupGoogleRoutes } from './google-auth';
import { insertQuizSchema, insertQuizQuestionSchema } from '@shared/schema';
import { z } from 'zod';
// Extend Express User type to include custom fields
// Nicole figured out this TypeScript declaration after 2 hours of type errors!
// No need to import PassportUser; define your own user type extension below.

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      email: string;
      isAdmin: boolean;
      // Add other custom fields as needed
    }
  }
}
import { DatabaseStorage } from "./db-storage-fixed";
const storage = new DatabaseStorage();
import { db } from "./db";
import { desc, sql, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { 
  insertUserSchema, insertPostSchema, insertBookSchema, insertFollowSchema,
  insertLikeSchema, insertRepostSchema, insertBookLogSchema, insertContentReportSchema,
  insertGuestSessionSchema, insertNotificationSchema, insertCommentSchema,
  books, users, posts, contentReports, likes, reposts, comments
} from "@shared/schema";


const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Initialize achievements in the database
async function initializeAchievements() {
  try {
    const existingAchievements = await storage.getAchievements();
    if (existingAchievements.length === 0) {
      // Create default achievements
      await storage.createAchievement({
        name: "First Book",
        description: "Complete your first book",
        category: "bookworm",
        icon: "📖",
        points: 10,
        requirement: { type: "books_read", count: 1 }
      });
      
      await storage.createAchievement({
        name: "Bookworm",
        description: "Read 5 books",
        category: "bookworm",
        icon: "🐛",
        points: 25,
        requirement: { type: "books_read", count: 5 }
      });
      
      await storage.createAchievement({
        name: "Reading Master",
        description: "Read 10 books",
        category: "bookworm",
        icon: "🎓",
        points: 50,
        requirement: { type: "books_read", count: 10 }
      });
      
      await storage.createAchievement({
        name: "Critic",
        description: "Write 5 book reviews",
        category: "critic",
        icon: "✍️",
        points: 20,
        requirement: { type: "reviews_written", count: 5 }
      });
      
      await storage.createAchievement({
        name: "Social Butterfly",
        description: "Follow 10 users",
        category: "social",
        icon: "🦋",
        points: 15,
        requirement: { type: "following", count: 10 }
      });
      
      await storage.createAchievement({
        name: "Popular Reader",
        description: "Get 5 followers",
        category: "social",
        icon: "⭐",
        points: 20,
        requirement: { type: "followers", count: 5 }
      });
    }
  } catch (error) {
    console.log("Achievement initialization skipped:", error);
  }
}

// Middleware for authentication
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Optional auth middleware (for guest access)
const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (!err) req.user = user;
    });
  }
  next();
};

// Admin middleware
const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const user = await storage.getUser((req.user as { id: number }).id);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize passport and session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'skynote-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true in production with HTTPS
  }));
  
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Configure Google OAuth
  configureGoogleAuth();
  setupGoogleRoutes(app);
  
  const httpServer = createServer(app);
  
  // Initialize achievements if they don't exist
  await initializeAchievements();

  // Ensure user has all achievement records initialized
  async function ensureUserAchievements(userId: number) {
    try {
      const achievements = await storage.getAchievements();
      const userAchievements = await storage.getUserAchievements(userId);
      
      // Create missing achievement records for this user
      for (const achievement of achievements) {
        const existing = userAchievements.find(ua => ua.achievementId === achievement.id);
        if (!existing) {
          await storage.updateUserAchievement(userId, achievement.id, 0);
        }
      }
    } catch (error) {
      console.log("User achievement initialization failed:", error);
    }
  }

  // Calculate real-time achievement progress based on user stats
  async function calculateAchievementProgress(userId: number, achievementType: string): Promise<number> {
    try {
      switch (achievementType) {
        case 'books_read':
          const completedBooks = await storage.getUserBookLogs(userId, 'finished');
          return completedBooks.length;
        case 'reviews_written':
          const userPosts = await storage.getUserPosts(userId);
          return userPosts.filter(post => post.type === 'review').length;
        case 'following':
          const following = await storage.getFollowing(userId);
          return following.length;
        case 'followers':
          const followers = await storage.getFollowers(userId);
          return followers.length;
        default:
          return 0;
      }
    } catch (error) {
      console.log(`Progress calculation failed for ${achievementType}:`, error);
      return 0;
    }
  }

  // Comprehensive achievement sync and award system
  async function syncAndAwardAchievements(userId: number) {
    try {
      // Ensure user has all achievement records
      await ensureUserAchievements(userId);
      
      const achievements = await storage.getAchievements();
      const userAchievements = await storage.getUserAchievements(userId);
      
      for (const achievement of achievements) {
        const requirement = achievement.requirement as any;
        if (requirement?.type && requirement?.count) {
          // Calculate real-time progress
          const currentProgress = await calculateAchievementProgress(userId, requirement.type);
          
          // Update progress in database
          await storage.updateUserAchievement(userId, achievement.id, currentProgress);
          
          // Check if achievement should be unlocked
          if (currentProgress >= requirement.count) {
            const userAchievement = userAchievements.find(ua => ua.achievementId === achievement.id);
            if (!userAchievement?.isUnlocked) {
              await storage.unlockAchievement(userId, achievement.id);
              
              // Award points
              const user = await storage.getUser(userId);
              if (user) {
                await storage.updateUser(userId, { 
                  points: (user.points || 0) + achievement.points 
                });
              }
              
              // Create notification
              await storage.createNotification({
                userId,
                type: 'achievement',
                title: 'Achievement Unlocked!',
                message: `You earned "${achievement.name}" and ${achievement.points} points!`
              });
            }
          }
        }
      }
    } catch (error) {
      console.log("Achievement sync failed:", error);
    }
  }

  // Legacy function for backward compatibility
  async function checkAndAwardAchievements(userId: number, activityType: string, currentValue: number) {
    await syncAndAwardAchievements(userId);
  }
  
  // Firebase authentication sync
  app.post("/api/auth/firebase-sync", async (req, res) => {
    try {
      const { firebaseUid, email, displayName, avatar } = req.body;
      
      // Check if user already exists by email
      let user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Create new user from Firebase data
        const newUser = await storage.createUser({
          username: email.split('@')[0], // Use email prefix as username
          email,
          password: firebaseUid, // Use Firebase UID as password placeholder
          displayName,
          bio: null,
          avatar,
          currentlyReading: null,
          favoriteQuote: null
        });
        user = newUser;
      }
      
      // Generate JWT token for our system
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
      
      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          bio: user.bio,
          avatar: user.avatar,
          currentlyReading: user.currentlyReading,
          favoriteQuote: user.favoriteQuote,
          isAdmin: user.isAdmin,
          points: user.points,
          followersCount: user.followersCount,
          followingCount: user.followingCount
        },
        token
      });
    } catch (error) {
      console.error("Firebase sync error:", error);
      res.status(500).json({ message: "Failed to sync Firebase user" });
    }
  });

  // Email verification and Google OAuth authentication routes
  
  // Register with email verification
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password if provided (for local registration)
      let hashedPassword = null;
      if (validatedData.password) {
        hashedPassword = await bcrypt.hash(validatedData.password, 10);
      }
      
      // Generate email verification token
      const emailVerificationToken = emailService.generateVerificationToken();
      
      // Create user (unverified)
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
        emailVerified: false,
        emailVerificationToken,
        authProvider: 'local'
      });

      // Send verification email
      const emailSent = await emailService.sendVerificationEmail(
        user.email, 
        emailVerificationToken, 
        user.displayName
      );
      
      if (!emailSent) {
        console.warn('Email verification failed to send, but user was created');
      }

      const token = jwt.sign(
  { id: user.id, username: user.username, email: user.email, isAdmin: user.isAdmin },
  JWT_SECRET,
  { expiresIn: "7d" }
);

res.status(201).json({ 
  message: "Registration successful! Please check your email to verify your account.",
  user: { 
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    emailVerified: user.emailVerified
  },
  token
});
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Email verification endpoint
  app.get("/api/auth/verify-email", async (req, res) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: "Invalid verification token" });
      }

      // Find user by verification token
      const user = await storage.getUserByVerificationToken(token);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired verification token" });
      }

      // Update user as verified
      await storage.updateUser(user.id, {
        emailVerified: true,
        emailVerificationToken: null
      });

      res.json({ message: "Email verified successfully! You can now log in." });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ message: "Email verification failed" });
    }
  });

  // Google OAuth routes
  app.get('/api/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email']
  }));

  app.get('/api/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login?error=google_auth_failed' }),
    async (req, res) => {
      // Successful authentication
      const user = req.user as any;
      
      // Generate JWT token for consistency with local auth
      const token = jwt.sign({ 
        id: user.id, 
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin || false
      }, JWT_SECRET);
      
      // Redirect to frontend with token
      res.redirect(`/?token=${token}&welcome=true`);
    }
  );

  // Password reset request
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists for security
        return res.json({ message: "If an account with that email exists, we've sent password reset instructions." });
      }

      // Generate reset token
      const resetToken = emailService.generateVerificationToken();
      
      // Store reset token (you'd typically add this to user model)
      await storage.updateUser(user.id, {
        emailVerificationToken: resetToken // Reusing this field for password reset
      });

      // Send reset email
      const emailSent = await emailService.sendPasswordResetEmail(
        user.email,
        resetToken,
        user.displayName
      );

      res.json({ message: "If an account with that email exists, we've sent password reset instructions." });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Password reset request failed" });
    }
  });

  // Password reset confirmation
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      // Find user by reset token
      const user = await storage.getUserByVerificationToken(token);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update password and clear token
      await storage.updateUser(user.id, {
        password: hashedPassword,
        emailVerificationToken: null
      });

      res.json({ message: "Password reset successfully! You can now log in with your new password." });
    } catch (error) {
      console.error("Password reset confirmation error:", error);
      res.status(500).json({ message: "Password reset failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!user.password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign({ id: user.id, username: user.username, isAdmin: user.isAdmin }, JWT_SECRET);
      
      res.json({ 
        user: { ...user, password: undefined }, 
        token 
      });
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

  // Admin registration endpoint
  app.post("/api/auth/register-admin", async (req, res) => {
    try {
      const { adminKey, ...userData } = req.body;
      
     // In your backend's admin registration route
const ADMIN_REGISTRATION_KEY = process.env.ADMIN_REGISTRATION_KEY; // Direct read from .env

if (!ADMIN_REGISTRATION_KEY) {
  console.error('ADMIN_REGISTRATION_KEY environment variable is not set!');
  return res.status(500).json({ message: 'Server configuration error: Admin key missing' });
}

if (adminKey !== ADMIN_REGISTRATION_KEY) {
  return res.status(403).json({ message: "Invalid admin registration key" });
}
      const validatedData = insertUserSchema.parse(userData);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      if (!validatedData.password) {
        return res.status(400).json({ message: "Password is required for admin registration" });
      }
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      
      // Create admin user
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
        isAdmin: true,
        emailVerified: true,
      });

      // Generate JWT token
      const token = jwt.sign({ 
        id: user.id, 
        username: user.username, 
        isAdmin: true 
      }, JWT_SECRET);
      
      res.status(201).json({ 
        user: { ...user, password: undefined }, 
        token 
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid input", error });
    }
  });

  // Guest session routes
  app.post("/api/guest/session", async (req, res) => {
    try {
      const sessionId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const session = await storage.createGuestSession({
        sessionId,
        preferences: req.body.preferences || {},
        viewedContent: [],
      });
      
      res.status(201).json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to create guest session", error });
    }
  });

  app.get("/api/guest/session/:sessionId", async (req, res) => {
    try {
      const session = await storage.getGuestSession(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

  app.put("/api/guest/session/:sessionId", async (req, res) => {
    try {
      const session = await storage.updateGuestSession(req.params.sessionId, req.body);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to update session", error });
    }
  });

  // User routes
  app.get("/api/users/me", authenticateToken, async (req, res) => {
    try {
      const user = await storage.getUser((req.user as { id: number }).id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ ...user, password: undefined });
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

  app.get("/api/users/:id", optionalAuth, async (req, res) => {
    try {
      const user = await storage.getUser(parseInt(req.params.id));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ ...user, password: undefined });
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

  app.put("/api/users/:id", authenticateToken, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Only allow users to update their own profile
      if (!req.user || userId !== (req.user as { id: number }).id) {
        return res.status(403).json({ message: "Not authorized to update this profile" });
      }

      const { displayName, bio, currentlyReading, favoriteQuote } = req.body;
      
      const updatedUser = await storage.updateUser(userId, {
        displayName,
        bio: bio || null,
        currentlyReading: currentlyReading || null,
        favoriteQuote: favoriteQuote || null,
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ ...updatedUser, password: undefined });
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

  app.get("/api/users/:id/stats", optionalAuth, async (req, res) => {
    try {
      const stats = await storage.getUserStats(parseInt(req.params.id));
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

  app.get("/api/users/:id/settings", authenticateToken, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Only allow users to see their own settings
      if (!req.user || userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      // Get user's notification preferences from database
      const notificationPreferences = await storage.getNotificationPreferences(userId);
      
      const userSettings = {
        profile: {
          isProfilePublic: true,
        },
        notifications: {
          emailNotifications: notificationPreferences.emailNotifications,
          pushNotifications: notificationPreferences.pushNotifications,
          followNotifications: notificationPreferences.newFollowers,
          likeNotifications: notificationPreferences.likesOnPosts,
          commentNotifications: notificationPreferences.comments,
          repostNotifications: notificationPreferences.reposts,
        },
        privacy: {
          showReadingActivity: true,
          allowFollowers: true,
          showAchievements: true,
          dataSharing: false,
        },
        reading: {
          yearlyGoal: 24,
          preferredGenres: ['Fiction'],
          readingReminders: true,
          shareProgress: true,
        },
      };

      res.json(userSettings);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

  app.put("/api/users/:id/settings", authenticateToken, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Only allow users to update their own settings
      if (!req.user || userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const { notifications } = req.body;

      // If notification settings are provided, update them
      if (notifications) {
        const notificationPreferences = {
          emailNotifications: Boolean(notifications.emailNotifications),
          pushNotifications: Boolean(notifications.pushNotifications),
          newFollowers: Boolean(notifications.followNotifications),
          likesOnPosts: Boolean(notifications.likeNotifications),
          comments: Boolean(notifications.commentNotifications),
          reposts: Boolean(notifications.repostNotifications)
        };

        await storage.updateNotificationPreferences(userId, notificationPreferences);
      }

      res.json({ message: "Settings updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

  // Book routes - Open Library API integration
  app.get("/api/books/search", optionalAuth, async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: "Search query required" });
      }

      // Search Open Library API for authentic book data
      const openLibraryUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=20`;
      const response = await fetch(openLibraryUrl);
      
      if (!response.ok) {
        throw new Error('Failed to fetch from Open Library');
      }

      const data = await response.json();
      const openLibraryBooks = data.docs?.map((doc: any) => ({
        title: doc.title || 'Unknown Title',
        author: doc.author_name?.[0] || 'Unknown Author',
        isbn: doc.isbn?.[0] || null,
        coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
        description: doc.first_sentence?.[0] || null,
        openLibraryKey: doc.key || null,
        publishYear: doc.first_publish_year || null,
        pageCount: doc.number_of_pages_median || null,
        subjects: doc.subject?.slice(0, 5) || [],
        averageRating: null,
        ratingsCount: 0
      })) || [];

      // Also search local database for user-added books
      const localBooks = await storage.searchBooks(q);
      
      // Combine results, prioritizing Open Library data
      const allBooks = [...openLibraryBooks, ...localBooks];
      const uniqueBooks = allBooks.filter((book, index, self) => 
        index === self.findIndex(b => b.title === book.title && b.author === book.author)
      );

      res.json(uniqueBooks.slice(0, 20));
    } catch (error) {
      console.error('Search books error:', error);
      // Fallback to local search if Open Library fails
      try {
        const books = await storage.searchBooks(req.query.q as string);
        res.json(books);
      } catch (fallbackError) {
        res.status(500).json({ message: "Search service unavailable", error });
      }
    }
  });

  app.get("/api/books/trending", optionalAuth, async (req, res) => {
    try {
      const { period = 'weekly' } = req.query;
      const books = await storage.getTrendingBooks(period as string);
      res.json(books);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

  app.get("/api/books/recent", optionalAuth, async (req, res) => {
    try {
      // For now, return trending books as recent books since they're actively used
      const books = await storage.getTrendingBooks('recent');
      res.json(books);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

  app.post("/api/books", authenticateToken, async (req, res) => {
    try {
      const validatedData = insertBookSchema.parse(req.body);
      const book = await storage.createBook(validatedData);
      res.status(201).json(book);
    } catch (error) {
      res.status(400).json({ message: "Invalid input", error });
    }
  });

  app.get("/api/books/:id", optionalAuth, async (req, res) => {
    try {
      const book = await storage.getBook(parseInt(req.params.id));
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }
      res.json(book);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

  // Post routes
  app.get("/api/posts/feed", optionalAuth, async (req, res) => {
    try {
      const { type } = req.query;
      const posts = await storage.getFeedPosts(req.user?.id, type as string);
      
      // Add user and book information to posts
      const enrichedPosts = await Promise.all(posts.map(async (post) => {
        const user = await storage.getUser(post.userId!);
        const book = post.bookId ? await storage.getBook(post.bookId) : null;
        return {
          ...post,
          user: user ? { ...user, password: undefined } : null,
          book,
        };
      }));
      
      res.json(enrichedPosts);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

  app.get("/api/posts/:id", optionalAuth, async (req, res) => {
    try {
      const post = await storage.getPost(parseInt(req.params.id));
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      const user = await storage.getUser(post.userId!);
      const book = post.bookId ? await storage.getBook(post.bookId) : null;
      
      res.json({
        ...post,
        user: user ? { ...user, password: undefined } : null,
        book,
      });
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

  app.post("/api/posts", authenticateToken, async (req, res) => {
    try {
      let bookId = req.body.bookId;
      
      // If book data is provided but no bookId, create the book first
      if (req.body.book && !bookId) {
        const book = await storage.createBook({
          title: req.body.book.title,
          author: req.body.book.author,
          coverUrl: req.body.book.coverUrl,
          isbn: req.body.book.isbn,
          description: req.body.book.description,
          openLibraryKey: req.body.book.openLibraryKey,
        });
        bookId = book.id;
      }
      
      const validatedData = insertPostSchema.parse({
        ...req.body,
        userId: req.user!.id,
        bookId,
      });
      
      const post = await storage.createPost(validatedData);
      
      // Auto-sync all achievements after post creation
      if (req.user) {
        await syncAndAwardAchievements(req.user.id);
      }
      
      res.status(201).json(post);
    } catch (error) {
      res.status(400).json({ message: "Invalid input", error });
    }
  });

  app.put("/api/posts/:id", authenticateToken, async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const existingPost = await storage.getPost(postId);
      
      if (!existingPost) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      if (!req.user || existingPost.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to edit this post" });
      }
      
      const updatedPost = await storage.updatePost(postId, req.body);
      res.json(updatedPost);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

  app.delete("/api/posts/:id", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const postId = parseInt(req.params.id);
      const existingPost = await storage.getPost(postId);
      
      if (!existingPost) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      if (existingPost.userId !== req.user.id && !req.user.isAdmin) {
        return res.status(403).json({ message: "Not authorized to delete this post" });
      }
      
      const deleted = await storage.deletePost(postId);
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Failed to delete post" });
      }
    } catch (error) {
      console.error('Delete post error:', error);
      res.status(500).json({ message: "Server error", error });
    }
  });

  // User posts routes
  app.get("/api/users/:id/posts", optionalAuth, async (req, res) => {
    try {
      const posts = await storage.getUserPosts(parseInt(req.params.id));
      
      const enrichedPosts = await Promise.all(posts.map(async (post) => {
        const user = await storage.getUser(post.userId!);
        const book = post.bookId ? await storage.getBook(post.bookId) : null;
        return {
          ...post,
          user: user ? { ...user, password: undefined } : null,
          book,
        };
      }));
      
      res.json(enrichedPosts);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

  app.get("/api/users/:id/liked-posts", authenticateToken, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Only allow users to see their own liked posts
      if (!req.user || userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const posts = await storage.getLikedPosts(userId);
      
      const enrichedPosts = await Promise.all(posts.map(async (post) => {
        const user = await storage.getUser(post.userId!);
        const book = post.bookId ? await storage.getBook(post.bookId) : null;
        return {
          ...post,
          user: user ? { ...user, password: undefined } : null,
          book,
        };
      }));
      
      res.json(enrichedPosts);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

  app.get("/api/users/:id/reposts", optionalAuth, async (req, res) => {
    try {
      const posts = await storage.getUserReposts(parseInt(req.params.id));
      
      const enrichedPosts = await Promise.all(posts.map(async (post) => {
        const user = await storage.getUser(post.userId!);
        const book = post.bookId ? await storage.getBook(post.bookId) : null;
        return {
          ...post,
          user: user ? { ...user, password: undefined } : null,
          book,
        };
      }));
      
      res.json(enrichedPosts);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

  // Social interaction routes
  app.post("/api/posts/:id/like", authenticateToken, async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const isLiked = await storage.isPostLiked(req.user.id, postId);
      
      if (isLiked) {
        await storage.unlikePost(req.user.id, postId);
        res.json({ liked: false });
      } else {
        await storage.likePost(req.user.id, postId);
        res.json({ liked: true });
      }
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

  app.post("/api/posts/:id/repost", authenticateToken, async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const { comment } = req.body;

      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const repost = await storage.repostPost(req.user.id, postId, comment);
      res.status(201).json(repost);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

  app.post("/api/users/:id/follow", authenticateToken, async (req, res) => {
    try {
      const followedId = parseInt(req.params.id);
      
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (followedId === req.user.id) {
        return res.status(400).json({ message: "Cannot follow yourself" });
      }
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const isFollowing = await storage.isFollowing(req.user.id, followedId);
      
      if (isFollowing) {
        await storage.unfollowUser(req.user.id, followedId);
        res.json({ following: false });
      } else {
        await storage.followUser(req.user.id, followedId);
        res.json({ following: true });
      }
      
      // Auto-sync achievements for both users after any follow/unfollow action
      if (req.user) {
        await syncAndAwardAchievements(req.user.id);
      }
      await syncAndAwardAchievements(followedId);
      
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

  app.delete("/api/users/:id/follow", authenticateToken, async (req, res) => {
    try {
      const followedId = parseInt(req.params.id);
      
      if (followedId === req.user.id) {
        return res.status(400).json({ message: "Cannot unfollow yourself" });
      }
      
      const isFollowing = await storage.isFollowing(req.user.id, followedId);
      
      if (!isFollowing) {
        return res.status(400).json({ message: "You are not following this user" });
      }
      
      await storage.unfollowUser(req.user.id, followedId);
      res.json({ following: false });
      
      // Auto-sync achievements for both users after unfollow action
      await syncAndAwardAchievements(req.user.id);
      await syncAndAwardAchievements(followedId);
      
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

  app.get("/api/users/:id/followers", optionalAuth, async (req, res) => {
    try {
      const followers = await storage.getFollowers(parseInt(req.params.id));
      const sanitizedFollowers = followers.map(user => ({ ...user, password: undefined }));
      res.json(sanitizedFollowers);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

  app.get("/api/users/:id/following", optionalAuth, async (req, res) => {
    try {
      const following = await storage.getFollowing(parseInt(req.params.id));
      const sanitizedFollowing = following.map(user => ({ ...user, password: undefined }));
      res.json(sanitizedFollowing);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

  app.get("/api/users/:id/follow-status", authenticateToken, async (req, res) => {
    try {
      const followedId = parseInt(req.params.id);
      const isFollowing = await storage.isFollowing(req.user.id, followedId);
      res.json({ following: isFollowing });
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

  // Achievement routes
  app.get("/api/achievements", optionalAuth, async (req, res) => {
    try {
      const achievements = await storage.getAchievements();
      res.json(achievements);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

  app.get("/api/users/:id/achievements", optionalAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Auto-sync achievements before returning results
      await syncAndAwardAchievements(userId);
      
      const userAchievements = await storage.getUserAchievements(userId);
      const achievements = await storage.getAchievements();
      
      // Get actual user statistics for real-time progress calculation
      const completedBooks = await storage.getUserBookLogs(userId, 'finished');
      const userPosts = await storage.getUserPosts(userId);
      const reviewPosts = userPosts.filter(post => post.type === 'review');
      const followers = await storage.getFollowers(userId);
      const following = await storage.getFollowing(userId);
      
      const enrichedAchievements = achievements.map(achievement => {
        const userAchievement = userAchievements.find(ua => ua.achievementId === achievement.id);
        const requirement = achievement.requirement as any;
        
        // Calculate real-time progress based on achievement type
        let actualProgress = 0;
        if (requirement?.type) {
          switch (requirement.type) {
            case 'books_read':
              actualProgress = completedBooks.length;
              break;
            case 'reviews_written':
              actualProgress = reviewPosts.length;
              break;
            case 'following':
              actualProgress = following.length;
              break;
            case 'followers':
              actualProgress = followers.length;
              break;
            default:
              actualProgress = userAchievement?.progress || 0;
          }
        }
        
        // Check if achievement should be unlocked based on current progress
        const shouldBeUnlocked = requirement?.count && 
          actualProgress >= requirement.count;
        
        return {
          ...achievement,
          progress: actualProgress,
          isUnlocked: userAchievement?.isUnlocked || shouldBeUnlocked || false,
          unlockedAt: userAchievement?.unlockedAt || null,
        };
      });
      
      res.json(enrichedAchievements);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

  // Book logging routes
  app.get("/api/users/:id/book-logs", authenticateToken, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Only allow users to see their own book logs
      if (userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const { status } = req.query;
      const bookLogs = await storage.getUserBookLogs(userId, status as string);
      
      const enrichedLogs = await Promise.all(bookLogs.map(async (log) => {
        const book = await storage.getBook(log.bookId!);
        return { ...log, book };
      }));
      
      res.json(enrichedLogs);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

  app.post("/api/book-logs", authenticateToken, async (req, res) => {
    try {
      const validatedData = insertBookLogSchema.parse({
        ...req.body,
        userId: req.user!.id,
      });
      
      // Check if book log already exists for this user and book
      let existingLog;
      if (typeof validatedData.bookId === "number") {
        existingLog = await storage.getBookLog(req.user!.id, validatedData.bookId);
      } else {
        return res.status(400).json({ message: "Invalid or missing bookId" });
      }
      
      let bookLog;
      if (existingLog) {
        // Update existing log
        // Fix the book log update to handle completion properly
        const updateData: any = {
          status: validatedData.status,
          progress: validatedData.progress,
        };
        
        if (validatedData.rating !== undefined) {
          updateData.rating = validatedData.rating;
        }
        
        if (validatedData.status === 'completed') {
          updateData.progress = 100;
          updateData.finishDate = new Date();
        } else if (validatedData.status === 'currently-reading' && !existingLog.startDate) {
          updateData.startDate = new Date();
        }
        
        bookLog = await storage.updateBookLog(existingLog.id, updateData);
      } else {
        // Create new log
        bookLog = await storage.createBookLog(validatedData);
      }
      
      // Award points for completing books
      if (validatedData.status === 'completed') {
        const pointsEarned = 10; // 10 points for completing a book
        const user = await storage.getUser(req.user!.id);
        if (user) {
          await storage.updateUser(req.user!.id, { 
            points: (user.points || 0) + pointsEarned
          });
        }
        
        // Check for reading achievements
        const userBookLogs = await storage.getUserBookLogs(req.user!.id, 'completed');
        const completedBooks = userBookLogs.length;
        
        // Use the achievement progression helper
        await checkAndAwardAchievements(req.user!.id, 'books_read', completedBooks);
      }
      
      res.status(201).json(bookLog);
    } catch (error) {
      res.status(400).json({ message: "Invalid input", error });
    }
  });

  // Update book log status
  app.patch("/api/book-logs/:id", authenticateToken, async (req, res) => {
    try {
      const logId = parseInt(req.params.id);
      const updates = req.body;
      
      const updatedLog = await storage.updateBookLog(logId, updates);
      
      if (!updatedLog) {
        return res.status(404).json({ message: "Book log not found" });
      }
      
      // Check for completion achievements and auto-sync all achievements
      if (updates.status === 'finished') {
        const pointsEarned = 10;
        const user = await storage.getUser(req.user!.id);
        if (user) {
          await storage.updateUser(req.user!.id, { 
            points: (user.points || 0) + pointsEarned
          });
        }
      }
      
      // Auto-sync all achievements for this user after any book log update
      await syncAndAwardAchievements(req.user!.id);
      
      res.json(updatedLog);
    } catch (error) {
      console.error("Book log update error:", error);
      res.status(500).json({ message: "Server error", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Notification routes
  app.get("/api/notifications", authenticateToken, async (req, res) => {
    try {
      const notifications = await storage.getNotifications(req.user.id);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

  app.put("/api/notifications/:id/read", authenticateToken, async (req, res) => {
    try {
      const success = await storage.markNotificationRead(parseInt(req.params.id));
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ message: "Notification not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

  // Content reporting routes
  app.post("/api/reports", optionalAuth, async (req, res) => {
    try {
      const reportData = insertContentReportSchema.parse({
        ...req.body,
        reporterId: req.user?.id || null,
      });
      
      const report = await storage.createContentReport(reportData);
      res.status(201).json(report);
    } catch (error) {
      res.status(400).json({ message: "Invalid input", error });
    }
  });

  // Analytics routes
  app.get("/api/leaderboard", optionalAuth, async (req, res) => {
    try {
      const { limit = 10 } = req.query;
      const leaderboard = await storage.getLeaderboard(parseInt(limit as string));
      const sanitizedLeaderboard = leaderboard.map(user => ({ ...user, password: undefined }));
      res.json(sanitizedLeaderboard);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

  // Admin routes
  app.get("/api/admin/stats", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const userCount = await db.select().from(users);
      const postCount = await db.select().from(posts);
      const bookCount = await db.select().from(books);
      const reportCount = await storage.getContentReports();
      const pendingReports = await storage.getContentReports('pending');

      const stats = {
        totalUsers: userCount.length,
        totalPosts: postCount.length,
        totalBooks: bookCount.length,
        totalReports: reportCount.length,
        pendingReports: pendingReports.length,
        activeUsers: userCount.length
      };

      res.json(stats);
    } catch (error) {
      console.error("Admin stats error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  });

  app.get("/api/admin/users", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
      res.json(allUsers);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

  app.put("/api/admin/users/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { isAdmin } = req.body;
      
      const updatedUser = await storage.updateUser(userId, { isAdmin: Boolean(isAdmin) });
      
      if (updatedUser) {
        res.json(updatedUser);
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

  app.delete("/api/admin/users/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Prevent admins from deleting themselves
      if (userId === req.user?.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      const success = await storage.deleteUser(userId);
      
      if (success) {
        res.json({ message: "User successfully removed" });
      } else {
        res.status(404).json({ message: "User not found or deletion failed" });
      }
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

  app.get("/api/admin/reports", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { status } = req.query;
      const reports = await storage.getContentReports(status as string);
      res.json(reports);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

  app.put("/api/admin/reports/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const reportId = parseInt(req.params.id);
      const { status } = req.body;
      
      // Get the report first to check postId
      const reports = await storage.getContentReports();
      const report = reports.find(r => r.id === reportId);
      
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }
      
      const updatedReport = await storage.updateContentReport(reportId, {
        ...req.body,
        reviewedBy: req.user.id,
      });
      
      // If report is approved or resolved, automatically delete the associated post
      if ((status === 'approved' || status === 'resolved') && report.postId) {
        try {
          console.log(`Attempting to delete post ${report.postId} and all related data...`);
          
          // Use database transaction to ensure all related data is deleted in proper order
          await db.transaction(async (tx) => {
            const postId = report.postId;
            
            // Delete all foreign key references to the post first
            if (postId != null) {
              console.log(`Deleting likes for post ${postId}...`);
              await tx.delete(likes).where(eq(likes.postId, postId));

              console.log(`Deleting reposts for post ${postId}...`);
              await tx.delete(reposts).where(eq(reposts.postId, postId));

              console.log(`Deleting comments for post ${postId}...`);
              await tx.delete(comments).where(eq(comments.postId, postId));

              console.log(`Deleting content reports for post ${postId}...`);
              await tx.delete(contentReports).where(eq(contentReports.postId, postId));

              // Finally delete the post itself
              console.log(`Deleting post ${postId}...`);
              await tx.delete(posts).where(eq(posts.id, postId));
            } else {
              console.warn('postId is null, skipping deletion of related data.');
            }
          });
          
          console.log(`Successfully deleted post ${report.postId} and all related data`);
        } catch (deleteError) {
          console.error(`Failed to delete post ${report.postId}:`, deleteError);
        }
      }
      
      if (updatedReport) {
        res.json(updatedReport);
      } else {
        res.status(404).json({ message: "Report not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

  // Comment routes
  app.get("/api/posts/:id/comments", optionalAuth, async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const comments = await storage.getPostComments(postId);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

  app.post("/api/posts/:id/comments", authenticateToken, async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const validatedData = insertCommentSchema.parse({
        ...req.body,
        postId,
        userId: req.user.id
      });
      
      const comment = await storage.createComment(validatedData);
      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid comment data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Server error", error });
      }
    }
  });

  // Quiz routes
  app.get("/api/quizzes", optionalAuth, async (req, res) => {
    try {
      const quizzes = await storage.getQuizzes();
      res.json(quizzes);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

  app.get("/api/quizzes/my/:userId", authenticateToken, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (req.user!.id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const quizzes = await storage.getUserQuizzes(userId);
      res.json(quizzes);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

  app.get("/api/quizzes/:id/questions", optionalAuth, async (req, res) => {
    try {
      const quizId = parseInt(req.params.id);
      const questions = await storage.getQuizQuestions(quizId);
      res.json(questions);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

app.post("/api/quizzes", authenticateToken, async (req, res) => {
  try {
    const { questions, ...quizData } = req.body;

    // Combine the request data with the server-side user ID BEFORE validation
    const dataToValidate = {
      ...quizData,
      createdBy: req.user!.id,
    };

    // 1. Validate the main quiz properties (which now includes 'createdBy')
    const validatedQuizMainData = insertQuizSchema.parse(dataToValidate);

    // 2. Validate the questions array
    if (questions && Array.isArray(questions) && questions.length > 0) { // <<< CHANGE: Added check for questions.length > 0
      const insertableQuestionSchema = insertQuizQuestionSchema.omit({ quizId: true, order: true });
      questions.forEach((q: any) => {
        insertableQuestionSchema.parse(q);
      });
    } else {
     
      console.warn("No questions array or empty questions array provided for quiz creation."); // 
      // If you want to enforce questions, you could throw an error here:
      // throw new Error("A quiz must have at least one question.");
    }

    // Combine validated main data with the questions array.
    // Note: validatedQuizMainData already contains createdBy from the dataToValidate step
    const quiz = await storage.createQuiz({
      ...validatedQuizMainData, //
      questions: questions, // Pass the original questions array to createQuiz for insertion
    });

    res.status(201).json(quiz); // Send back the created quiz object

  } catch (error) { 
    if (error instanceof z.ZodError) {
      // If a Zod validation error occurs, send a 400 Bad Request with details
      console.error("Zod validation error during quiz creation:", error.errors); 
      res.status(400).json({ message: "Invalid quiz data (Zod validation failed)", errors: error.errors });
    } else if (error instanceof Error) {
      // Catch any other generic JavaScript errors (like the custom one we threw for questions)
      console.error("General error during quiz creation:", error.message); 
      // For user-friendly messages, you might check error.message here
      res.status(400).json({ message: error.message }); // Send the error message to the client
    } else {
      // Catch anything else that's not an Error object
      console.error("Unexpected server error during quiz creation:", error); // 
      res.status(500).json({ message: "Internal server error", error: String(error) });
    }
  }
}); 
    // Combine the request data with the server-side user ID BEFORE validation

  app.post("/api/quizzes/submit", authenticateToken, async (req, res) => {
    try {
      const { quizId, answers, timeSpent } = req.body;
      const result = await storage.submitQuizResult({
        quizId,
        userId: req.user!.id,
        answers,
        timeSpent
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

  app.post("/api/quizzes/:id/submit", authenticateToken, async (req, res) => {
    try {
      const quizId = parseInt(req.params.id);
      const { answers, timeSpent } = req.body;
      const result = await storage.submitQuizResult({
        quizId,
        userId: req.user!.id,
        answers,
        timeSpent
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  });

  // Open Library API proxy
  app.get("/api/openlibrary/search", optionalAuth, async (req, res) => {
    try {
      const { q, limit = 10 } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: "Search query required" });
      }
      
      const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=${limit}`);
      const data = await response.json();
      
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to search Open Library", error });
    }
  });

  app.get("/api/openlibrary/books/:key", optionalAuth, async (req, res) => {
    try {
      const { key } = req.params;
      const response = await fetch(`https://openlibrary.org/books/${key}.json`);
      const data = await response.json();
      
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch book from Open Library", error });
    }
  });

  return httpServer;
}
