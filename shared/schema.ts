/**
 * Database Schema for Skynote Social Reading Platform
 *
 * Authors: Tyrell Stephenson (ID: 166880) & Nicole Muraguri (ID: 161061)
 * Final Project - Advanced Web Development
 *
 * This schema took us 3 days to get right! We kept changing our minds about
 * how to structure the relationships between users, books, and posts.
 * Nicole designed the social features while Tyrell handled the book tracking system.
 */

import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - Nicole spent forever figuring out the email verification fields
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password"),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  avatar: text("avatar"),
  currentlyReading: text("currently_reading"),
  favoriteQuote: text("favorite_quote"),
  isAdmin: boolean("is_admin").default(false),
  points: integer("points").default(0),
  followersCount: integer("followers_count").default(0),
  followingCount: integer("following_count").default(0),
  emailVerified: boolean("email_verified").default(false),
  emailVerificationToken: text("email_verification_token"),
  googleId: text("google_id"),
  authProvider: text("auth_provider").default("local"),
  // Notification preferences
  notificationPreferences: jsonb("notification_preferences").default({
    emailNotifications: true,
    pushNotifications: true,
    newFollowers: true,
    likesOnPosts: true,
    comments: true,
    reposts: false
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(), // Changed
});

// Guest sessions table
export const guestSessions = pgTable("guest_sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  preferences: jsonb("preferences"),
  viewedContent: jsonb("viewed_content"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(), // Changed
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }).defaultNow(), // Changed
});

// Books table
export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  isbn: text("isbn"),
  coverUrl: text("cover_url"),
  description: text("description"),
  openLibraryKey: text("open_library_key"),
  averageRating: text("average_rating"),
  ratingsCount: integer("ratings_count").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(), // Changed
});

// Posts table
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  bookId: integer("book_id").references(() => books.id),
  type: text("type").notNull(), // 'review', 'fanart', 'post', 'quote'
  title: text("title"),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  rating: integer("rating"), // 1-5 stars for reviews
  likesCount: integer("likes_count").default(0),
  commentsCount: integer("comments_count").default(0),
  repostsCount: integer("reposts_count").default(0),
  isApproved: boolean("is_approved").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(), // Changed
});

// Follows table
export const follows = pgTable("follows", {
  id: serial("id").primaryKey(),
  followerId: integer("follower_id").references(() => users.id),
  followedId: integer("followed_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(), // Changed
});

// Likes table
export const likes = pgTable("likes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  postId: integer("post_id").references(() => posts.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(), // Changed
});

// Reposts table
export const reposts = pgTable("reposts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  postId: integer("post_id").references(() => posts.id),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(), // Changed
});

// Book logs table
export const bookLogs = pgTable("book_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  bookId: integer("book_id").references(() => books.id),
  status: text("status").notNull(), // 'reading', 'finished', 'want-to-read'
  progress: integer("progress").default(0), // percentage
  startDate: timestamp("start_date", { withTimezone: true }), // Changed
  finishDate: timestamp("finish_date", { withTimezone: true }), // Changed
  rating: integer("rating"), // 1-5 stars
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(), // Changed
});

// Achievements table
export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // 'bookworm', 'critic', 'social'
  icon: text("icon").notNull(),
  points: integer("points").notNull(),
  requirement: jsonb("requirement"), // { type: 'books_read', count: 100 }
  isActive: boolean("is_active").default(true),
});

// User achievements table
export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  achievementId: integer("achievement_id").references(() => achievements.id),
  progress: integer("progress").default(0),
  isUnlocked: boolean("is_unlocked").default(false),
  unlockedAt: timestamp("unlocked_at", { withTimezone: true }), // Changed
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(), // Changed
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  type: text("type").notNull(), // 'like', 'follow', 'comment', 'achievement'
  title: text("title").notNull(),
  message: text("message").notNull(),
  data: jsonb("data"), // additional notification data
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(), // Changed
});

// Comments table
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  postId: integer("post_id").references(() => posts.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(), // Changed
});

// Content reports table
export const contentReports = pgTable("content_reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporter_id").references(() => users.id),
  postId: integer("post_id").references(() => posts.id),
  reason: text("reason").notNull(),
  description: text("description"),
  status: text("status").default("pending"), // 'pending', 'reviewed', 'resolved'
  reviewedBy: integer("reviewed_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(), // Changed
});

// Trending books table
export const trendingBooks = pgTable("trending_books", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").references(() => books.id),
  score: integer("score").notNull(),
  period: text("period").notNull(), // 'daily', 'weekly', 'monthly'
  calculatedAt: timestamp("calculated_at", { withTimezone: true }).defaultNow(), // Changed
});

// Quiz tables
export const quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  bookId: integer("book_id").references(() => books.id),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  difficulty: text("difficulty").notNull(), // 'easy', 'medium', 'hard'
  timeLimit: integer("time_limit").notNull().default(15), // minutes
  questionCount: integer("question_count").notNull().default(0),
  participantCount: integer("participant_count").notNull().default(0),
  averageScore: real("average_score").default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(), // Changed
});

export const quizQuestions = pgTable("quiz_questions", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").references(() => quizzes.id).notNull(),
  question: text("question").notNull(),
  options: text("options").array().notNull(),
  correctAnswer: integer("correct_answer").notNull(),
  explanation: text("explanation"),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(), // Changed
});

export const quizResults = pgTable("quiz_results", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").references(() => quizzes.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  score: real("score").notNull(),
  answers: text("answers").array().notNull(),
  timeSpent: integer("time_spent").notNull(), // seconds
  completedAt: timestamp("completed_at", { withTimezone: true }).defaultNow(), // Changed
});

// Insert schemas - these don't need changes as they omit the timestamp fields
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  points: true,
  followersCount: true,
  followingCount: true,
});

export const insertGuestSessionSchema = createInsertSchema(guestSessions).omit({
  id: true,
  createdAt: true,
  lastActiveAt: true,
});

export const insertBookSchema = createInsertSchema(books).omit({
  id: true,
  createdAt: true,
  ratingsCount: true,
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  createdAt: true,
  likesCount: true,
  commentsCount: true,
  repostsCount: true,
  isApproved: true,
});

export const insertFollowSchema = createInsertSchema(follows).omit({
  id: true,
  createdAt: true,
});

export const insertLikeSchema = createInsertSchema(likes).omit({
  id: true,
  createdAt: true,
});

export const insertRepostSchema = createInsertSchema(reposts).omit({
  id: true,
  createdAt: true,
});

export const insertBookLogSchema = createInsertSchema(bookLogs).omit({
  id: true,
  createdAt: true,
});

export const insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
});

export const insertUserAchievementSchema = createInsertSchema(userAchievements).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
});

export const insertContentReportSchema = createInsertSchema(contentReports).omit({
  id: true,
  createdAt: true,
});

export const insertQuizSchema = createInsertSchema(quizzes).omit({
  id: true,
  createdAt: true,
  questionCount: true,
  participantCount: true,
  averageScore: true,
});

export const insertQuizQuestionSchema = createInsertSchema(quizQuestions).omit({
  id: true,
  createdAt: true,
});

export const insertQuizResultSchema = createInsertSchema(quizResults).omit({
  id: true,
  completedAt: true,
});

// Type exports 
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type GuestSession = typeof guestSessions.$inferSelect;
export type InsertGuestSession = z.infer<typeof insertGuestSessionSchema>;
export type Book = typeof books.$inferSelect;
export type InsertBook = z.infer<typeof insertBookSchema>;
export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Follow = typeof follows.$inferSelect;
export type InsertFollow = z.infer<typeof insertFollowSchema>;
export type Like = typeof likes.$inferSelect;
export type InsertLike = z.infer<typeof insertLikeSchema>;
export type Repost = typeof reposts.$inferSelect;
export type InsertRepost = z.infer<typeof insertRepostSchema>;
export type BookLog = typeof bookLogs.$inferSelect;
export type InsertBookLog = z.infer<typeof insertBookLogSchema>;
export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type ContentReport = typeof contentReports.$inferSelect;
export type InsertContentReport = z.infer<typeof insertContentReportSchema>;
export type TrendingBook = typeof trendingBooks.$inferSelect;
export type Quiz = typeof quizzes.$inferSelect;
export type InsertQuiz = z.infer<typeof insertQuizSchema>;
export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type InsertQuizQuestion = z.infer<typeof insertQuizQuestionSchema>;
export type QuizResult = typeof quizResults.$inferSelect;
export type InsertQuizResult = z.infer<typeof insertQuizResultSchema>;