import { db } from './db';
import { 
  users, books, posts, follows, likes, reposts, bookLogs, achievements, 
  userAchievements, notifications, contentReports, comments, guestSessions,
  quizzes, quizQuestions, quizResults,
  type User, type Book, type Post, type Follow, type Like, type Repost, 
  type BookLog, type Achievement, type UserAchievement, type Notification, 
  type ContentReport, type Comment, type GuestSession,
  type Quiz, type QuizQuestion, type QuizResult,
  type InsertUser, type InsertBook, type InsertPost, type InsertFollow, 
  type InsertLike, type InsertRepost, type InsertBookLog, type InsertAchievement, 
  type InsertUserAchievement, type InsertNotification, type InsertContentReport, 
  type InsertComment, type InsertGuestSession, type InsertQuiz, type InsertQuizQuestion,
  type InsertQuizResult
} from '@shared/schema';
import { eq, and, desc, sql, like, inArray } from 'drizzle-orm';
import { IStorage } from './storage';

export class DatabaseStorage implements IStorage {
  // User methods
  
  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.emailVerificationToken, token));
    return user || undefined;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user || undefined;
  }

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

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      ...insertUser,
      points: 0,
      followersCount: 0,
      followingCount: 0,
    }).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      // Delete user's content in proper order to avoid foreign key constraints
      await db.delete(userAchievements).where(eq(userAchievements.userId, id));
      await db.delete(notifications).where(eq(notifications.userId, id));
      await db.delete(contentReports).where(eq(contentReports.reporterId, id));
      await db.delete(bookLogs).where(eq(bookLogs.userId, id));
      await db.delete(comments).where(eq(comments.userId, id));
      await db.delete(likes).where(eq(likes.userId, id));
      await db.delete(reposts).where(eq(reposts.userId, id));
      await db.delete(follows).where(eq(follows.followerId, id));
      await db.delete(follows).where(eq(follows.followedId, id));
      await db.delete(posts).where(eq(posts.userId, id));
      
      // Finally delete the user
      const result = await db.delete(users).where(eq(users.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  async updateNotificationPreferences(userId: number, preferences: any): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ notificationPreferences: preferences })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async getNotificationPreferences(userId: number): Promise<any> {
    const [result] = await db.select({ notificationPreferences: users.notificationPreferences })
      .from(users)
      .where(eq(users.id, userId));
    return result?.notificationPreferences || {
      emailNotifications: true,
      pushNotifications: true,
      newFollowers: true,
      likesOnPosts: true,
      comments: true,
      reposts: false
    };
  }

  // Guest session methods
  async getGuestSession(sessionId: string): Promise<GuestSession | undefined> {
    const [session] = await db.select().from(guestSessions).where(eq(guestSessions.sessionId, sessionId));
    return session || undefined;
  }

  async createGuestSession(insertSession: InsertGuestSession): Promise<GuestSession> {
    const [session] = await db.insert(guestSessions).values({
      ...insertSession,
      preferences: {},
      viewedContent: {},
    }).returning();
    return session;
  }

  async updateGuestSession(sessionId: string, updates: Partial<GuestSession>): Promise<GuestSession | undefined> {
    const [session] = await db.update(guestSessions)
      .set({ ...updates, lastActiveAt: new Date() })
      .where(eq(guestSessions.sessionId, sessionId))
      .returning();
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
    const [book] = await db.insert(books).values({
      ...insertBook,
      ratingsCount: 0,
    }).returning();
    return book;
  }

  async searchBooks(query: string): Promise<Book[]> {
    return await db.select().from(books)
      .where(like(books.title, `%${query}%`))
      .limit(20);
  }

  async getTrendingBooks(period: string): Promise<Book[]> {
    // Get books with actual review counts from posts table
    const trendingBooks = await db.select({
      id: books.id,
      title: books.title,
      author: books.author,
      isbn: books.isbn,
      coverUrl: books.coverUrl,
      description: books.description,
      openLibraryKey: books.openLibraryKey,
      averageRating: books.averageRating,
      ratingsCount: books.ratingsCount,
      createdAt: books.createdAt,
      reviewCount: sql<number>`COUNT(CASE WHEN ${posts.type} = 'review' THEN 1 END)::int`.as('reviewCount')
    })
    .from(books)
    .leftJoin(posts, eq(posts.bookId, books.id))
    .groupBy(books.id)
    .orderBy(desc(sql`COUNT(CASE WHEN ${posts.type} = 'review' THEN 1 END)`), desc(books.averageRating))
    .limit(10);
    
    return trendingBooks;
  }

  // Post methods with proper user and book relations
  async getPost(id: number): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post || undefined;
  }

  async createPost(insertPost: InsertPost): Promise<Post> {
    const [post] = await db.insert(posts).values({
      ...insertPost,
      likesCount: 0,
      commentsCount: 0,
      repostsCount: 0,
      isApproved: true,
    }).returning();
    return post;
  }

  async updatePost(id: number, updates: Partial<Post>): Promise<Post | undefined> {
    const [post] = await db.update(posts)
      .set(updates)
      .where(eq(posts.id, id))
      .returning();
    return post || undefined;
  }

  async deletePost(id: number): Promise<boolean> {
    try {
      // Delete related data first
      await db.delete(likes).where(eq(likes.postId, id));
      await db.delete(reposts).where(eq(reposts.postId, id));
      await db.delete(comments).where(eq(comments.postId, id));
      
      // Delete the post
      const result = await db.delete(posts).where(eq(posts.id, id));
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Delete post error:', error);
      return false;
    }
  }

  async getFeedPosts(userId?: number, type?: string): Promise<Post[]> {
    let query = db.select({
      id: posts.id,
      userId: posts.userId,
      bookId: posts.bookId,
      type: posts.type,
      title: posts.title,
      content: posts.content,
      imageUrl: posts.imageUrl,
      rating: posts.rating,
      likesCount: posts.likesCount,
      commentsCount: posts.commentsCount,
      repostsCount: posts.repostsCount,
      isApproved: posts.isApproved,
      createdAt: posts.createdAt,
      user: {
        id: users.id,
        username: users.username,
        email: users.email,
        displayName: users.displayName,
        avatar: users.avatar,
        points: users.points,
        followersCount: users.followersCount,
        followingCount: users.followingCount,
        createdAt: users.createdAt
      },
      book: {
        id: books.id,
        title: books.title,
        author: books.author,
        isbn: books.isbn,
        coverUrl: books.coverUrl,
        description: books.description,
        openLibraryKey: books.openLibraryKey,
        averageRating: books.averageRating,
        ratingsCount: books.ratingsCount,
        createdAt: books.createdAt
      }
    }).from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .leftJoin(books, eq(posts.bookId, books.id))
      .orderBy(desc(posts.createdAt));

    if (type) {
      // Apply type filter to base query before joining
      const baseQuery = db.select({
        id: posts.id,
        userId: posts.userId,
        bookId: posts.bookId,
        type: posts.type,
        title: posts.title,
        content: posts.content,
        imageUrl: posts.imageUrl,
        rating: posts.rating,
        likesCount: posts.likesCount,
        commentsCount: posts.commentsCount,
        repostsCount: posts.repostsCount,
        isApproved: posts.isApproved,
        createdAt: posts.createdAt,
        user: {
          id: users.id,
          username: users.username,
          email: users.email,
          displayName: users.displayName,
          avatar: users.avatar,
          points: users.points,
          followersCount: users.followersCount,
          followingCount: users.followingCount,
          createdAt: users.createdAt
        },
        book: {
          id: books.id,
          title: books.title,
          author: books.author,
          isbn: books.isbn,
          coverUrl: books.coverUrl,
          description: books.description,
          openLibraryKey: books.openLibraryKey,
          averageRating: books.averageRating,
          ratingsCount: books.ratingsCount,
          createdAt: books.createdAt
        }
      }).from(posts)
        .leftJoin(users, eq(posts.userId, users.id))
        .leftJoin(books, eq(posts.bookId, books.id))
        .where(eq(posts.type, type))
        .orderBy(desc(posts.createdAt))
        .limit(50);
      
      const result = await baseQuery;
      return result.map(row => ({
        ...row,
        user: row.user || { 
          id: 0, username: 'unknown', email: '', displayName: 'Unknown User', 
          avatar: null, points: 0, followersCount: 0, followingCount: 0, createdAt: new Date()
        },
        book: row.book
      })) as Post[];
    }

    const result = await query.limit(50);
    
    return result.map(row => ({
      ...row,
      user: row.user || { 
        id: 0, username: 'unknown', email: '', displayName: 'Unknown User', 
        avatar: null, points: 0, followersCount: 0, followingCount: 0, createdAt: new Date()
      },
      book: row.book
    })) as Post[];
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
    
    const validPostIds = likedPostIds.map(l => l.postId).filter(id => id !== null);
    if (validPostIds.length === 0) return [];
    
    return await db.select().from(posts)
      .where(inArray(posts.id, validPostIds))
      .orderBy(desc(posts.createdAt));
  }

  // Social methods
  async followUser(followerId: number, followedId: number): Promise<Follow> {
    const [follow] = await db.insert(follows).values({
      followerId,
      followedId,
    }).returning();

    // Update follower counts
    await db.update(users)
      .set({ followingCount: sql`following_count + 1` })
      .where(eq(users.id, followerId));
    
    await db.update(users)
      .set({ followersCount: sql`followers_count + 1` })
      .where(eq(users.id, followedId));

    return follow;
  }

  async unfollowUser(followerId: number, followedId: number): Promise<boolean> {
    const result = await db.delete(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followedId, followedId)));
    
    if ((result.rowCount || 0) > 0) {
      await db.update(users)
        .set({ followingCount: sql`following_count - 1` })
        .where(eq(users.id, followerId));
      
      await db.update(users)
        .set({ followersCount: sql`followers_count - 1` })
        .where(eq(users.id, followedId));
    }
    
    return (result.rowCount || 0) > 0;
  }

  async isFollowing(followerId: number, followedId: number): Promise<boolean> {
    const [follow] = await db.select().from(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followedId, followedId)));
    return !!follow;
  }

  async getFollowers(userId: number): Promise<User[]> {
    const result = await db.select({
      users: users
    }).from(follows)
      .innerJoin(users, eq(follows.followerId, users.id))
      .where(eq(follows.followedId, userId));
    
    return result.map(r => r.users);
  }

  async getFollowing(userId: number): Promise<User[]> {
    const result = await db.select({
      users: users
    }).from(follows)
      .innerJoin(users, eq(follows.followedId, users.id))
      .where(eq(follows.followerId, userId));
    
    return result.map(r => r.users);
  }

  // Like methods
  async likePost(userId: number, postId: number): Promise<Like> {
    const [like] = await db.insert(likes).values({
      userId,
      postId,
    }).returning();

    await db.update(posts)
      .set({ likesCount: sql`likes_count + 1` })
      .where(eq(posts.id, postId));

    return like;
  }

  async unlikePost(userId: number, postId: number): Promise<boolean> {
    const result = await db.delete(likes)
      .where(and(eq(likes.userId, userId), eq(likes.postId, postId)));
    
    if ((result.rowCount || 0) > 0) {
      await db.update(posts)
        .set({ likesCount: sql`likes_count - 1` })
        .where(eq(posts.id, postId));
    }
    
    return (result.rowCount || 0) > 0;
  }

  async isPostLiked(userId: number, postId: number): Promise<boolean> {
    const [like] = await db.select().from(likes)
      .where(and(eq(likes.userId, userId), eq(likes.postId, postId)));
    return !!like;
  }

  // Repost methods
  async repostPost(userId: number, postId: number, comment?: string): Promise<Repost> {
    const [repost] = await db.insert(reposts).values({
      userId,
      postId,
      comment: comment || null,
    }).returning();

    await db.update(posts)
      .set({ repostsCount: sql`reposts_count + 1` })
      .where(eq(posts.id, postId));

    return repost;
  }

  async unrepost(userId: number, postId: number): Promise<boolean> {
    const result = await db.delete(reposts)
      .where(and(eq(reposts.userId, userId), eq(reposts.postId, postId)));
    
    if ((result.rowCount || 0) > 0) {
      await db.update(posts)
        .set({ repostsCount: sql`reposts_count - 1` })
        .where(eq(posts.id, postId));
    }
    
    return (result.rowCount || 0) > 0;
  }

  async getUserReposts(userId: number): Promise<Post[]> {
    const repostedPostIds = await db.select({ postId: reposts.postId })
      .from(reposts)
      .where(eq(reposts.userId, userId));
    
    if (repostedPostIds.length === 0) return [];
    
    const validPostIds = repostedPostIds.map(r => r.postId).filter(id => id !== null) as number[];
    if (validPostIds.length === 0) return [];
    
    return await db.select().from(posts)
      .where(inArray(posts.id, validPostIds))
      .orderBy(desc(posts.createdAt));
  }

  // Book log methods
  async getBookLog(userId: number, bookId: number): Promise<BookLog | undefined> {
    const [log] = await db.select().from(bookLogs)
      .where(and(eq(bookLogs.userId, userId), eq(bookLogs.bookId, bookId)));
    return log || undefined;
  }

  async createBookLog(insertBookLog: InsertBookLog): Promise<BookLog> {
    const [log] = await db.insert(bookLogs).values(insertBookLog).returning();
    return log;
  }

  async updateBookLog(id: number, updates: Partial<BookLog>): Promise<BookLog | undefined> {
    // Process date strings to Date objects
    const processedUpdates = { ...updates };
    if (processedUpdates.startDate && typeof processedUpdates.startDate === 'string') {
      processedUpdates.startDate = new Date(processedUpdates.startDate);
    }
    if (processedUpdates.finishDate && typeof processedUpdates.finishDate === 'string') {
      processedUpdates.finishDate = new Date(processedUpdates.finishDate);
    }
    
    const [log] = await db.update(bookLogs)
      .set(processedUpdates)
      .where(eq(bookLogs.id, id))
      .returning();
    return log || undefined;
  }

  async getUserBookLogs(userId: number, status?: string): Promise<BookLog[]> {
    const conditions = [eq(bookLogs.userId, userId)];
    
    if (status) {
      conditions.push(eq(bookLogs.status, status));
    }
    
    return await db.select().from(bookLogs)
      .where(and(...conditions))
      .orderBy(desc(bookLogs.createdAt));
  }

  // Achievement methods
  async getAchievements(): Promise<Achievement[]> {
    return await db.select().from(achievements)
      .where(eq(achievements.isActive, true))
      .orderBy(achievements.category, achievements.points);
  }

  async getUserAchievements(userId: number): Promise<UserAchievement[]> {
    return await db.select().from(userAchievements)
      .where(eq(userAchievements.userId, userId));
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
    const [userAchievement] = await db.insert(userAchievements).values({
      userId,
      achievementId,
      progress: 100,
      unlockedAt: new Date(),
    }).returning();
    return userAchievement;
  }

  // Comment methods
  async getPostComments(postId: number): Promise<Comment[]> {
    const result = await db.select({
      id: comments.id,
      userId: comments.userId,
      postId: comments.postId,
      content: comments.content,
      createdAt: comments.createdAt,
      user: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatar: users.avatar
      }
    })
    .from(comments)
    .leftJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.postId, postId))
    .orderBy(desc(comments.createdAt));

    return result.map(row => ({
      id: row.id,
      userId: row.userId,
      postId: row.postId,
      content: row.content,
      createdAt: row.createdAt,
      user: row.user
    }));
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    const [comment] = await db.insert(comments).values(insertComment).returning();
    
    // Update comments count
    if (insertComment.postId) {
      await db.update(posts)
        .set({ commentsCount: sql`comments_count + 1` })
        .where(eq(posts.id, insertComment.postId));
    }
    
    return comment;
  }

  // Notification methods
  async getNotifications(userId: number): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values({
      ...insertNotification,
      isRead: false,
    }).returning();
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
    const [report] = await db.insert(contentReports).values({
      ...insertReport,
      status: 'pending',
    }).returning();
    return report;
  }

  async getContentReports(status?: string): Promise<ContentReport[]> {
    if (status) {
      return await db.select().from(contentReports)
        .where(eq(contentReports.status, status))
        .orderBy(desc(contentReports.createdAt));
    }
    
    return await db.select().from(contentReports)
      .orderBy(desc(contentReports.createdAt));
  }

  async updateContentReport(id: number, updates: Partial<ContentReport>): Promise<ContentReport | undefined> {
    const [report] = await db.update(contentReports)
      .set(updates)
      .where(eq(contentReports.id, id))
      .returning();
    return report || undefined;
  }

  // Analytics methods
  async getUserStats(userId: number): Promise<any> {
    const user = await this.getUser(userId);
    if (!user) return null;

    const userPosts = await this.getUserPosts(userId);
    const userBookLogs = await this.getUserBookLogs(userId);
    const userAchievements = await this.getUserAchievements(userId);

    return {
      postsCount: userPosts.length,
      booksRead: userBookLogs.filter(log => log.status === 'finished').length,
      achievementsUnlocked: userAchievements.filter(ua => ua.unlockedAt).length,
      totalPoints: user.points || 0,
      followersCount: user.followersCount || 0,
      followingCount: user.followingCount || 0,
    };
  }

  async getLeaderboard(limit = 10): Promise<User[]> {
    return await db.select().from(users)
      .orderBy(desc(users.points))
      .limit(limit);
  }

  // Quiz methods
  async getQuizzes(): Promise<Quiz[]> {
    return await db.select().from(quizzes);
  }

  async getUserQuizzes(userId: number): Promise<Quiz[]> {
    return await db.select().from(quizzes)
      .where(eq(quizzes.createdBy, userId));
  }

  async getQuizQuestions(quizId: number): Promise<QuizQuestion[]> {
    return await db.select().from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizId));
  }

  async createQuiz(quizData: any): Promise<Quiz> {
    const { questions, ...quizInfo } = quizData;
    
    // Create the quiz with proper schema compliance
    const [quiz] = await db.insert(quizzes)
      .values({
        title: quizInfo.title,
        description: quizInfo.description || '',
        bookId: quizInfo.bookId || null,
        createdBy: quizInfo.createdBy,
        difficulty: quizInfo.difficulty || 'medium',
        timeLimit: quizInfo.timeLimit || 15,
        questionCount: questions ? questions.length : 0,
        participantCount: 0,
        averageScore: 0,
        isActive: true
      })
      .returning();

    // Create the questions
    if (questions && questions.length > 0) {
      await db.insert(quizQuestions)
        .values(questions.map((q: any, index: number) => ({
          quizId: quiz.id,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          order: index + 1
        })));
    }

    return quiz;
  }

  async submitQuizResult(resultData: any): Promise<{ score: number; pointsEarned: number }> {
    const { quizId, userId, answers, timeSpent } = resultData;
    
    // Get quiz questions to calculate score
    const questions = await this.getQuizQuestions(quizId);
    let correctAnswers = 0;
    
    questions.forEach((question, index) => {
      if (answers[index] === question.correctAnswer) {
        correctAnswers++;
      }
    });
    
    const score = Math.round((correctAnswers / questions.length) * 100);
    const pointsEarned = Math.max(0, score - 50); // Points only for scores above 50%
    
    // Save quiz result using proper schema mapping
    await db.insert(quizResults)
      .values({
        quizId: quizId,
        userId: userId,
        score: score,
        answers: answers,
        timeSpent: timeSpent || 0
      });
    
    // Update user points
    if (pointsEarned > 0) {
      await db.update(users)
        .set({ 
          points: sql`${users.points} + ${pointsEarned}`
        })
        .where(eq(users.id, userId));
    }
    
    return { score, pointsEarned };
  }
}