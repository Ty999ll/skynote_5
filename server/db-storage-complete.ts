import {
  users, type User, type InsertUser,
  guestSessions, type GuestSession, type InsertGuestSession,
  books, type Book, type InsertBook,
  posts, type Post, type InsertPost,
  follows, type Follow, type InsertFollow,
  likes, type Like, type InsertLike,
  reposts, type Repost, type InsertRepost,
  bookLogs, type BookLog, type InsertBookLog,
  achievements, type Achievement, type InsertAchievement,
  userAchievements, type UserAchievement, type InsertUserAchievement,
  notifications, type Notification, type InsertNotification,
  comments, type Comment, type InsertComment,
  contentReports, type ContentReport, type InsertContentReport,
  quizzes, type Quiz, type InsertQuiz,
  quizQuestions, type QuizQuestion, type InsertQuizQuestion,
  quizResults, type QuizResult, type InsertQuizResult
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, like, and, or, isNull, count, sql } from "drizzle-orm";
import type { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;  
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.emailVerificationToken, token));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      // Delete in proper order to avoid foreign key constraint violations
      await db.delete(userAchievements).where(eq(userAchievements.userId, id));
      await db.delete(notifications).where(eq(notifications.userId, id));
      await db.delete(contentReports).where(eq(contentReports.reporterId, id));
      await db.delete(comments).where(eq(comments.userId, id));
      await db.delete(bookLogs).where(eq(bookLogs.userId, id));
      await db.delete(reposts).where(eq(reposts.userId, id));
      await db.delete(likes).where(eq(likes.userId, id));
      await db.delete(follows).where(or(eq(follows.followerId, id), eq(follows.followedId, id)));
      await db.delete(posts).where(eq(posts.userId, id));
      const result = await db.delete(users).where(eq(users.id, id));
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
  }

  // Guest session methods
  async getGuestSession(sessionId: string): Promise<GuestSession | undefined> {
    const [session] = await db.select().from(guestSessions).where(eq(guestSessions.sessionId, sessionId));
    return session || undefined;
  }

  async createGuestSession(insertSession: InsertGuestSession): Promise<GuestSession> {
    const [session] = await db.insert(guestSessions).values(insertSession).returning();
    return session;
  }

  async updateGuestSession(sessionId: string, updates: Partial<GuestSession>): Promise<GuestSession | undefined> {
    const [session] = await db.update(guestSessions).set(updates).where(eq(guestSessions.sessionId, sessionId)).returning();
    return session || undefined;
  }

  // Book methods
  async getBook(id: number): Promise<Book | undefined> {
    const [book] = await db.select().from(books).where(eq(books.id, id));
    return book || undefined;
  }

  async getBookByISBN(isbn: string): Promise<Book | undefined> {
    const [book] = await db.select().from(books).where(eq(books.isbn, isbn));
    return book || undefined;
  }

  async createBook(insertBook: InsertBook): Promise<Book> {
    const [book] = await db.insert(books).values(insertBook).returning();
    return book;
  }

  async searchBooks(query: string): Promise<Book[]> {
    return await db.select().from(books)
      .where(
        or(
          like(books.title, `%${query}%`),
          like(books.author, `%${query}%`)
        )
      )
      .limit(20);
  }

  async getTrendingBooks(period: string): Promise<Book[]> {
    return await db.select().from(books).limit(10);
  }

  // Post methods
  async getPost(id: number): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post || undefined;
  }

  async createPost(insertPost: InsertPost): Promise<Post> {
    const [post] = await db.insert(posts).values(insertPost).returning();
    return post;
  }

  async updatePost(id: number, updates: Partial<Post>): Promise<Post | undefined> {
    const [post] = await db.update(posts).set(updates).where(eq(posts.id, id)).returning();
    return post || undefined;
  }

  async deletePost(id: number): Promise<boolean> {
    const result = await db.delete(posts).where(eq(posts.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getFeedPosts(userId?: number, type?: string): Promise<Post[]> {
    let query = db.select().from(posts);
    
    if (type) {
      query = query.where(eq(posts.type, type));
    }
    
    return await query.orderBy(desc(posts.createdAt)).limit(50);
  }

  async getUserPosts(userId: number): Promise<Post[]> {
    return await db.select().from(posts)
      .where(eq(posts.userId, userId))
      .orderBy(desc(posts.createdAt));
  }

  async getLikedPosts(userId: number): Promise<Post[]> {
    const likedPostIds = await db.select({ postId: likes.postId })
      .from(likes)
      .where(eq(likes.userId, userId));
    
    if (likedPostIds.length === 0) return [];
    
    return await db.select().from(posts)
      .where(sql`${posts.id} IN ${sql.raw(`(${likedPostIds.map(l => l.postId).join(',')})`)}`);
  }

  // Social methods
  async followUser(followerId: number, followedId: number): Promise<Follow> {
    const [follow] = await db.insert(follows).values({ followerId, followedId }).returning();
    return follow;
  }

  async unfollowUser(followerId: number, followedId: number): Promise<boolean> {
    const result = await db.delete(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followedId, followedId)));
    return (result.rowCount || 0) > 0;
  }

  async isFollowing(followerId: number, followedId: number): Promise<boolean> {
    const [follow] = await db.select().from(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followedId, followedId)));
    return !!follow;
  }

  async getFollowers(userId: number): Promise<User[]> {
    const result = await db.select({ users }).from(follows)
      .innerJoin(users, eq(follows.followerId, users.id))
      .where(eq(follows.followedId, userId));
    return result.map(r => r.users);
  }

  async getFollowing(userId: number): Promise<User[]> {
    const result = await db.select({ users }).from(follows)
      .innerJoin(users, eq(follows.followedId, users.id))
      .where(eq(follows.followerId, userId));
    return result.map(r => r.users);
  }

  // Like methods
  async likePost(userId: number, postId: number): Promise<Like> {
    const [like] = await db.insert(likes).values({ userId, postId }).returning();
    return like;
  }

  async unlikePost(userId: number, postId: number): Promise<boolean> {
    const result = await db.delete(likes)
      .where(and(eq(likes.userId, userId), eq(likes.postId, postId)));
    return (result.rowCount || 0) > 0;
  }

  async isPostLiked(userId: number, postId: number): Promise<boolean> {
    const [like] = await db.select().from(likes)
      .where(and(eq(likes.userId, userId), eq(likes.postId, postId)));
    return !!like;
  }

  // Repost methods
  async repostPost(userId: number, postId: number, comment?: string): Promise<Repost> {
    const [repost] = await db.insert(reposts).values({ userId, postId, comment }).returning();
    return repost;
  }

  async unrepost(userId: number, postId: number): Promise<boolean> {
    const result = await db.delete(reposts)
      .where(and(eq(reposts.userId, userId), eq(reposts.postId, postId)));
    return (result.rowCount || 0) > 0;
  }

  async getUserReposts(userId: number): Promise<Post[]> {
    const result = await db.select({ posts }).from(reposts)
      .innerJoin(posts, eq(reposts.postId, posts.id))
      .where(eq(reposts.userId, userId));
    return result.map(r => r.posts);
  }

  // Book log methods
  async getBookLog(userId: number, bookId: number): Promise<BookLog | undefined> {
    const [bookLog] = await db.select().from(bookLogs)
      .where(and(eq(bookLogs.userId, userId), eq(bookLogs.bookId, bookId)));
    return bookLog || undefined;
  }

  async createBookLog(insertBookLog: InsertBookLog): Promise<BookLog> {
    const [bookLog] = await db.insert(bookLogs).values(insertBookLog).returning();
    return bookLog;
  }

  async updateBookLog(id: number, updates: Partial<BookLog>): Promise<BookLog | undefined> {
    const [bookLog] = await db.update(bookLogs).set(updates).where(eq(bookLogs.id, id)).returning();
    return bookLog || undefined;
  }

  async getUserBookLogs(userId: number, status?: string): Promise<BookLog[]> {
    let query = db.select().from(bookLogs).where(eq(bookLogs.userId, userId));
    
    if (status) {
      query = query.where(and(eq(bookLogs.userId, userId), eq(bookLogs.status, status)));
    }
    
    return await query.orderBy(desc(bookLogs.createdAt));
  }

  // Achievement methods
  async getAchievements(): Promise<Achievement[]> {
    return await db.select().from(achievements).where(eq(achievements.isActive, true));
  }

  async getUserAchievements(userId: number): Promise<UserAchievement[]> {
    return await db.select().from(userAchievements).where(eq(userAchievements.userId, userId));
  }

  async createAchievement(insertAchievement: InsertAchievement): Promise<Achievement> {
    const [achievement] = await db.insert(achievements).values(insertAchievement).returning();
    return achievement;
  }

  async updateUserAchievement(userId: number, achievementId: number, progress: number): Promise<UserAchievement | undefined> {
    const [userAchievement] = await db.update(userAchievements)
      .set({ progress })
      .where(and(eq(userAchievements.userId, userId), eq(userAchievements.achievementId, achievementId)))
      .returning();
    return userAchievement || undefined;
  }

  async unlockAchievement(userId: number, achievementId: number): Promise<UserAchievement | undefined> {
    const [userAchievement] = await db.update(userAchievements)
      .set({ isUnlocked: true, unlockedAt: new Date() })
      .where(and(eq(userAchievements.userId, userId), eq(userAchievements.achievementId, achievementId)))
      .returning();
    return userAchievement || undefined;
  }

  // Comment methods
  async getPostComments(postId: number): Promise<Comment[]> {
    return await db.select().from(comments)
      .where(eq(comments.postId, postId))
      .orderBy(asc(comments.createdAt));
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    const [comment] = await db.insert(comments).values(insertComment).returning();
    return comment;
  }

  // Notification methods
  async getNotifications(userId: number): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(insertNotification).returning();
    return notification;
  }

  async markNotificationRead(id: number): Promise<boolean> {
    const result = await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Content report methods
  async createContentReport(insertReport: InsertContentReport): Promise<ContentReport> {
    const [report] = await db.insert(contentReports).values(insertReport).returning();
    return report;
  }

  async getContentReports(status?: string): Promise<ContentReport[]> {
    let query = db.select().from(contentReports);
    
    if (status) {
      query = query.where(eq(contentReports.status, status));
    }
    
    return await query.orderBy(desc(contentReports.createdAt));
  }

  async updateContentReport(id: number, updates: Partial<ContentReport>): Promise<ContentReport | undefined> {
    const [report] = await db.update(contentReports).set(updates).where(eq(contentReports.id, id)).returning();
    return report || undefined;
  }

  // Analytics methods
  async getUserStats(userId: number): Promise<any> {
    const user = await this.getUser(userId);
    if (!user) return null;

    const bookLogsCount = await db.select({ count: count() }).from(bookLogs).where(eq(bookLogs.userId, userId));
    const postsCount = await db.select({ count: count() }).from(posts).where(eq(posts.userId, userId));
    const followersCount = await db.select({ count: count() }).from(follows).where(eq(follows.followedId, userId));
    const followingCount = await db.select({ count: count() }).from(follows).where(eq(follows.followerId, userId));

    return {
      user,
      stats: {
        booksRead: bookLogsCount[0]?.count || 0,
        postsCreated: postsCount[0]?.count || 0,
        followers: followersCount[0]?.count || 0,
        following: followingCount[0]?.count || 0,
      }
    };
  }

  async getLeaderboard(limit = 10): Promise<User[]> {
    return await db.select().from(users)
      .orderBy(desc(users.points))
      .limit(limit);
  }

  // Quiz methods (placeholder implementations)
  async getQuizzes(): Promise<Quiz[]> {
    return await db.select().from(quizzes).where(eq(quizzes.isActive, true));
  }

  async getQuiz(id: number): Promise<Quiz | undefined> {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, id));
    return quiz || undefined;
  }

  async createQuiz(insertQuiz: InsertQuiz): Promise<Quiz> {
    const [quiz] = await db.insert(quizzes).values(insertQuiz).returning();
    return quiz;
  }

  async getQuizQuestions(quizId: number): Promise<QuizQuestion[]> {
    return await db.select().from(quizQuestions).where(eq(quizQuestions.quizId, quizId));
  }

  async createQuizQuestion(insertQuestion: InsertQuizQuestion): Promise<QuizQuestion> {
    const [question] = await db.insert(quizQuestions).values(insertQuestion).returning();
    return question;
  }

  async submitQuizResult(insertResult: InsertQuizResult): Promise<QuizResult> {
    const [result] = await db.insert(quizResults).values(insertResult).returning();
    return result;
  }

  async getUserQuizResults(userId: number): Promise<QuizResult[]> {
    return await db.select().from(quizResults).where(eq(quizResults.userId, userId));
  }
}