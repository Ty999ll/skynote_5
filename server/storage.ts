import { 
  users, books, posts, follows, likes, reposts, bookLogs, achievements, 
  userAchievements, notifications, contentReports, trendingBooks, guestSessions, comments,
  quizzes, quizQuestions, quizResults,
  type User, type InsertUser, type Book, type InsertBook, type Post, type InsertPost,
  type Follow, type InsertFollow, type Like, type InsertLike, type Repost, type InsertRepost,
  type BookLog, type InsertBookLog, type Achievement, type InsertAchievement,
  type UserAchievement, type InsertUserAchievement, type Notification, type InsertNotification,
  type ContentReport, type InsertContentReport, type TrendingBook, type GuestSession, type InsertGuestSession,
  type Comment, type InsertComment, type Quiz, type InsertQuiz, type QuizQuestion, type InsertQuizQuestion,
  type QuizResult, type InsertQuizResult
} from "@shared/schema";
export type { User } from "@shared/schema";
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;

  // Guest session methods
  getGuestSession(sessionId: string): Promise<GuestSession | undefined>;
  createGuestSession(session: InsertGuestSession): Promise<GuestSession>;
  updateGuestSession(sessionId: string, updates: Partial<GuestSession>): Promise<GuestSession | undefined>;
  
  // Book methods
  getBook(id: number): Promise<Book | undefined>;
  getBookByISBN(isbn: string): Promise<Book | undefined>;
  createBook(book: InsertBook): Promise<Book>;
  searchBooks(query: string): Promise<Book[]>;
  getTrendingBooks(period: string): Promise<Book[]>;
  
  // Post methods
  getPost(id: number): Promise<Post | undefined>;
  createPost(post: InsertPost): Promise<Post>;
  updatePost(id: number, updates: Partial<Post>): Promise<Post | undefined>;
  deletePost(id: number): Promise<boolean>;
  getFeedPosts(userId?: number, type?: string): Promise<Post[]>;
  getUserPosts(userId: number): Promise<Post[]>;
  getLikedPosts(userId: number): Promise<Post[]>;
  
  // Social methods
  followUser(followerId: number, followedId: number): Promise<Follow>;
  unfollowUser(followerId: number, followedId: number): Promise<boolean>;
  isFollowing(followerId: number, followedId: number): Promise<boolean>;
  getFollowers(userId: number): Promise<User[]>;
  getFollowing(userId: number): Promise<User[]>;
  
  // Like methods
  likePost(userId: number, postId: number): Promise<Like>;
  unlikePost(userId: number, postId: number): Promise<boolean>;
  isPostLiked(userId: number, postId: number): Promise<boolean>;
  
  // Repost methods
  repostPost(userId: number, postId: number, comment?: string): Promise<Repost>;
  unrepost(userId: number, postId: number): Promise<boolean>;
  getUserReposts(userId: number): Promise<Post[]>;
  
  // Book log methods
  getBookLog(userId: number, bookId: number): Promise<BookLog | undefined>;
  createBookLog(bookLog: InsertBookLog): Promise<BookLog>;
  updateBookLog(id: number, updates: Partial<BookLog>): Promise<BookLog | undefined>;
  getUserBookLogs(userId: number, status?: string): Promise<BookLog[]>;
  
  // Achievement methods
  getAchievements(): Promise<Achievement[]>;
  getUserAchievements(userId: number): Promise<UserAchievement[]>;
  createAchievement(achievement: InsertAchievement): Promise<Achievement>;
  updateUserAchievement(userId: number, achievementId: number, progress: number): Promise<UserAchievement | undefined>;
  unlockAchievement(userId: number, achievementId: number): Promise<UserAchievement | undefined>;
  
  // Comment methods
  getPostComments(postId: number): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  
  // Notification methods
  getNotifications(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: number): Promise<boolean>;
  
  // Content report methods
  createContentReport(report: InsertContentReport): Promise<ContentReport>;
  getContentReports(status?: string): Promise<ContentReport[]>;
  updateContentReport(id: number, updates: Partial<ContentReport>): Promise<ContentReport | undefined>;
  
  // Analytics methods
  getUserStats(userId: number): Promise<any>;
  getLeaderboard(limit?: number): Promise<User[]>;
}

export class MemStorage implements IStorage {
  private users = new Map<number, User>();
  private guestSessions = new Map<string, GuestSession>();
  private books = new Map<number, Book>();
  private posts = new Map<number, Post>();
  private follows = new Map<string, Follow>();
  private likes = new Map<string, Like>();
  private reposts = new Map<string, Repost>();
  private bookLogs = new Map<string, BookLog>();
  private achievements = new Map<number, Achievement>();
  private userAchievements = new Map<string, UserAchievement>();
  private notifications = new Map<number, Notification>();
  private contentReports = new Map<number, ContentReport>();
  private trendingBooks = new Map<number, TrendingBook>();
  private comments = new Map<number, Comment>();
  
  private currentUserId = 1;
  private currentBookId = 1;
  private currentPostId = 1;
  private currentFollowId = 1;
  private currentLikeId = 1;
  private currentRepostId = 1;
  private currentBookLogId = 1;
  private currentAchievementId = 1;
  private currentUserAchievementId = 1;
  private currentNotificationId = 1;
  private currentContentReportId = 1;
  private currentCommentId = 1;
  private currentGuestSessionId = 1;

  constructor() {
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Create sample achievements
    const sampleAchievements: Achievement[] = [
      {
        id: this.currentAchievementId++,
        name: "Bookworm",
        description: "Read 100 books this year",
        category: "bookworm",
        icon: "fas fa-book",
        points: 100,
        requirement: { type: "books_read", count: 100 },
        isActive: true,
      },
      {
        id: this.currentAchievementId++,
        name: "Critic",
        description: "Write 50 book reviews",
        category: "critic",
        icon: "fas fa-star",
        points: 200,
        requirement: { type: "reviews_written", count: 50 },
        isActive: true,
      },
      {
        id: this.currentAchievementId++,
        name: "Social Reader",
        description: "Get 1000 followers",
        category: "social",
        icon: "fas fa-users",
        points: 50,
        requirement: { type: "followers", count: 1000 },
        isActive: true,
      },
    ];

    sampleAchievements.forEach(achievement => {
      this.achievements.set(achievement.id, achievement);
    });

    // Create sample books
    const sampleBooks: Book[] = [
      {
        id: this.currentBookId++,
        title: "A Ballad of Songbirds and Snakes",
        author: "Suzanne Collins",
        isbn: "9781338635171",
        coverUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f",
        description: "A prequel to The Hunger Games trilogy",
        openLibraryKey: "OL123456M",
        averageRating: "4.2",
        ratingsCount: 1200,
        createdAt: new Date(),
      },
      {
        id: this.currentBookId++,
        title: "The Seven Husbands of Evelyn Hugo",
        author: "Taylor Jenkins Reid",
        isbn: "9781501161933",
        coverUrl: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e",
        description: "A reclusive Hollywood icon opens up to a young journalist",
        openLibraryKey: "OL123457M",
        averageRating: "4.5",
        ratingsCount: 856,
        createdAt: new Date(),
      },
      {
        id: this.currentBookId++,
        title: "Fourth Wing",
        author: "Rebecca Yarros",
        isbn: "9781649374042",
        coverUrl: "https://images.unsplash.com/photo-1618365908648-e71bd5716cba",
        description: "Dragons, war college, and romance",
        openLibraryKey: "OL123458M",
        averageRating: "4.8",
        ratingsCount: 2100,
        createdAt: new Date(),
      },
    ];

    sampleBooks.forEach(book => {
      this.books.set(book.id, book);
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.emailVerificationToken === token);
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.googleId === googleId);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      ...insertUser,
      id: this.currentUserId++,
      points: 0,
      followersCount: 0,
      followingCount: 0,
      createdAt: new Date(),
      password: insertUser.password !== undefined ? insertUser.password : null,
      bio: insertUser.bio !== undefined ? insertUser.bio : null,
      avatar: insertUser.avatar !== undefined ? insertUser.avatar : null,
      currentlyReading: insertUser.currentlyReading !== undefined ? insertUser.currentlyReading : null,
      favoriteQuote: insertUser.favoriteQuote !== undefined ? insertUser.favoriteQuote : null,
      emailVerificationToken: insertUser.emailVerificationToken !== undefined ? insertUser.emailVerificationToken : null,
      googleId: insertUser.googleId !== undefined ? insertUser.googleId : null,
      notificationPreferences: insertUser.notificationPreferences !== undefined ? insertUser.notificationPreferences : null,
      isAdmin: insertUser.isAdmin !== undefined ? insertUser.isAdmin : null,
      emailVerified: insertUser.emailVerified !== undefined ? insertUser.emailVerified : null,
      authProvider: insertUser.authProvider !== undefined ? insertUser.authProvider : null,
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      // Delete user's content in proper order
      this.userAchievements.forEach((achievement, key) => {
        if (achievement.userId === id) {
          this.userAchievements.delete(key);
        }
      });
      
      this.notifications.forEach((notification, key) => {
        if (notification.userId === id) {
          this.notifications.delete(key);
        }
      });
      
      this.contentReports.forEach((report, key) => {
        if (report.reporterId === id) {
          this.contentReports.delete(key);
        }
      });
      
      this.bookLogs.forEach((log, key) => {
        if (log.userId === id) {
          this.bookLogs.delete(key);
        }
      });
      
      this.comments.forEach((comment, key) => {
        if (comment.userId === id) {
          this.comments.delete(key);
        }
      });
      
      this.likes.forEach((like, key) => {
        if (like.userId === id) {
          this.likes.delete(key);
        }
      });
      
      this.reposts.forEach((repost, key) => {
        if (repost.userId === id) {
          this.reposts.delete(key);
        }
      });
      
      this.follows.forEach((follow, key) => {
        if (follow.followerId === id || follow.followedId === id) {
          this.follows.delete(key);
        }
      });
      
      this.posts.forEach((post, key) => {
        if (post.userId === id) {
          this.posts.delete(key);
        }
      });
      
      // Finally delete the user
      return this.users.delete(id);
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  // Guest session methods
  async getGuestSession(sessionId: string): Promise<GuestSession | undefined> {
    return this.guestSessions.get(sessionId);
  }

  async createGuestSession(insertSession: InsertGuestSession): Promise<GuestSession> {
    const session: GuestSession = {
      ...insertSession,
      id: this.currentGuestSessionId++,
      createdAt: new Date(),
      lastActiveAt: new Date(),
      preferences: insertSession.preferences !== undefined ? insertSession.preferences : {},
      viewedContent: insertSession.viewedContent !== undefined ? insertSession.viewedContent : {},
    };
    this.guestSessions.set(session.sessionId, session);
    return session;
  }

  async updateGuestSession(sessionId: string, updates: Partial<GuestSession>): Promise<GuestSession | undefined> {
    const session = this.guestSessions.get(sessionId);
    if (!session) return undefined;
    
    const updatedSession = { ...session, ...updates, lastActiveAt: new Date() };
    this.guestSessions.set(sessionId, updatedSession);
    return updatedSession;
  }

  // Book methods
  async getBook(id: number): Promise<Book | undefined> {
    return this.books.get(id);
  }

  async getBookByISBN(isbn: string): Promise<Book | undefined> {
    return Array.from(this.books.values()).find(book => book.isbn === isbn);
  }

  async createBook(insertBook: InsertBook): Promise<Book> {
    const book: Book = {
      id: this.currentBookId++,
      title: insertBook.title,
      author: insertBook.author,
      description: insertBook.description !== undefined ? insertBook.description : null,
      isbn: insertBook.isbn !== undefined ? insertBook.isbn : null,
      coverUrl: insertBook.coverUrl !== undefined ? insertBook.coverUrl : null,
      openLibraryKey: insertBook.openLibraryKey !== undefined ? insertBook.openLibraryKey : null,
      averageRating: insertBook.averageRating !== undefined ? insertBook.averageRating : null,
      ratingsCount: 0,
      createdAt: new Date(),
    };
    this.books.set(book.id, book);
    return book;
  }

  async searchBooks(query: string): Promise<Book[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.books.values()).filter(book => 
      book.title.toLowerCase().includes(lowerQuery) ||
      book.author.toLowerCase().includes(lowerQuery)
    );
  }

  async getTrendingBooks(period: string): Promise<Book[]> {
    // Return sample trending books for now
    return Array.from(this.books.values()).slice(0, 5);
  }

  // Post methods
  async getPost(id: number): Promise<Post | undefined> {
    return this.posts.get(id);
  }

  async createPost(insertPost: InsertPost): Promise<Post> {
    const post: Post = {
      id: this.currentPostId++,
      createdAt: new Date(),
      title: insertPost.title !== undefined ? insertPost.title : null,
      type: insertPost.type,
      userId: insertPost.userId !== undefined ? insertPost.userId : null,
      bookId: insertPost.bookId !== undefined ? insertPost.bookId : null,
      content: insertPost.content,
      imageUrl: insertPost.imageUrl !== undefined ? insertPost.imageUrl : null,
      rating: insertPost.rating !== undefined ? insertPost.rating : null,
      likesCount: 0,
      commentsCount: 0,
      repostsCount: 0,
      isApproved: true,
    };
    this.posts.set(post.id, post);
    return post;
  }

  async updatePost(id: number, updates: Partial<Post>): Promise<Post | undefined> {
    const post = this.posts.get(id);
    if (!post) return undefined;
    
    const updatedPost = { ...post, ...updates };
    this.posts.set(id, updatedPost);
    return updatedPost;
  }

  async deletePost(id: number): Promise<boolean> {
    // Delete the post
    const postDeleted = this.posts.delete(id);
    
    if (postDeleted) {
      // Clean up related likes
      const likesToDelete = Array.from(this.likes.entries())
        .filter(([key, like]) => like.postId === id)
        .map(([key]) => key);
      likesToDelete.forEach(key => this.likes.delete(key));
      
      // Clean up related reposts
      const repostsToDelete = Array.from(this.reposts.entries())
        .filter(([key, repost]) => repost.postId === id)
        .map(([key]) => key);
      repostsToDelete.forEach(key => this.reposts.delete(key));
      
      // Clean up related comments
      const commentsToDelete = Array.from(this.comments.entries())
        .filter(([key, comment]) => comment.postId === id)
        .map(([key]) => key);
      commentsToDelete.forEach(key => this.comments.delete(key));
    }
    
    return postDeleted;
  }

  async getFeedPosts(userId?: number, type?: string): Promise<Post[]> {
    const allPosts = Array.from(this.posts.values());
    return allPosts.sort((a, b) => {
      const bTime = b.createdAt ? b.createdAt.getTime() : 0;
      const aTime = a.createdAt ? a.createdAt.getTime() : 0;
      return bTime - aTime;
    });
  }

  async getUserPosts(userId: number): Promise<Post[]> {
    return Array.from(this.posts.values())
      .filter(post => post.userId === userId)
      .sort((a, b) => {
        const bTime = b.createdAt ? b.createdAt.getTime() : 0;
        const aTime = a.createdAt ? a.createdAt.getTime() : 0;
        return bTime - aTime;
      });
  }

  async getLikedPosts(userId: number): Promise<Post[]> {
    const userLikes = Array.from(this.likes.values()).filter(like => like.userId === userId);
    const likedPostIds = userLikes.map(like => like.postId);
    return Array.from(this.posts.values())
      .filter(post => likedPostIds.includes(post.id))
      .sort((a, b) => {
        const bTime = b.createdAt ? b.createdAt.getTime() : 0;
        const aTime = a.createdAt ? a.createdAt.getTime() : 0;
        return bTime - aTime;
      });
  }

  // Social methods
  async followUser(followerId: number, followedId: number): Promise<Follow> {
    const follow: Follow = {
      id: this.currentFollowId++,
      followerId,
      followedId,
      createdAt: new Date(),
    };
    this.follows.set(`${followerId}-${followedId}`, follow);
    return follow;
  }

  async unfollowUser(followerId: number, followedId: number): Promise<boolean> {
    return this.follows.delete(`${followerId}-${followedId}`);
  }

  async isFollowing(followerId: number, followedId: number): Promise<boolean> {
    return this.follows.has(`${followerId}-${followedId}`);
  }

  async getFollowers(userId: number): Promise<User[]> {
    const followers = Array.from(this.follows.values())
      .filter(follow => follow.followedId === userId);
    const followerIds = followers.map(follow => follow.followerId);
    return Array.from(this.users.values()).filter(user => followerIds.includes(user.id));
  }

  async getFollowing(userId: number): Promise<User[]> {
    const following = Array.from(this.follows.values())
      .filter(follow => follow.followerId === userId);
    const followingIds = following.map(follow => follow.followedId);
    return Array.from(this.users.values()).filter(user => followingIds.includes(user.id));
  }

  // Like methods
  async likePost(userId: number, postId: number): Promise<Like> {
    const like: Like = {
      id: this.currentLikeId++,
      userId,
      postId,
      createdAt: new Date(),
    };
    this.likes.set(`${userId}-${postId}`, like);
    
    // Update post likes count
    const post = this.posts.get(postId);
    if (post) {
      this.posts.set(postId, { ...post, likesCount: (post.likesCount ?? 0) + 1 });
    }
    
    return like;
  }

  async unlikePost(userId: number, postId: number): Promise<boolean> {
    const deleted = this.likes.delete(`${userId}-${postId}`);
    
    if (deleted) {
      // Update post likes count
      const post = this.posts.get(postId);
      if (post && post.likesCount !== null && post.likesCount > 0) {
        this.posts.set(postId, { ...post, likesCount: post.likesCount - 1 });
      }
    }
    
    return deleted;
  }

  async isPostLiked(userId: number, postId: number): Promise<boolean> {
    return this.likes.has(`${userId}-${postId}`);
  }

  // Repost methods
  async repostPost(userId: number, postId: number, comment?: string): Promise<Repost> {
    const repost: Repost = {
      id: this.currentRepostId++,
      userId,
      postId,
      comment: comment !== undefined ? comment : null,
      createdAt: new Date(),
    };
    this.reposts.set(`${userId}-${postId}`, repost);
    
    // Update post reposts count
    const post = this.posts.get(postId);
    if (post) {
      this.posts.set(postId, { ...post, repostsCount: post.repostsCount + 1 });
    }
    
    return repost;
  }

  async unrepost(userId: number, postId: number): Promise<boolean> {
    const deleted = this.reposts.delete(`${userId}-${postId}`);
    
    if (deleted) {
      // Update post reposts count
      const post = this.posts.get(postId);
      if (post && (post.repostsCount ?? 0) > 0) {
        this.posts.set(postId, { ...post, repostsCount: (post.repostsCount ?? 0) - 1 });
      }
    }
    
    return deleted;
  }

  async getUserReposts(userId: number): Promise<Post[]> {
    const userReposts = Array.from(this.reposts.values()).filter(repost => repost.userId === userId);
    const repostedPostIds = userReposts.map(repost => repost.postId);
    return Array.from(this.posts.values())
      .filter(post => repostedPostIds.includes(post.id))
      .sort((a, b) => {
        const aTime = a.createdAt ? a.createdAt.getTime() : 0;
        const bTime = b.createdAt ? b.createdAt.getTime() : 0;
        return bTime - aTime;
      });
  }

  // Book log methods
  async getBookLog(userId: number, bookId: number): Promise<BookLog | undefined> {
    return this.bookLogs.get(`${userId}-${bookId}`);
  }

  async createBookLog(insertBookLog: InsertBookLog): Promise<BookLog> {
    const bookLog: BookLog = {
      id: this.currentBookLogId++,
      createdAt: new Date(),
      userId: insertBookLog.userId !== undefined ? insertBookLog.userId : null,
      progress: insertBookLog.progress !== undefined ? insertBookLog.progress : null,
      status: insertBookLog.status,
      bookId: insertBookLog.bookId !== undefined ? insertBookLog.bookId : null,
      rating: insertBookLog.rating !== undefined ? insertBookLog.rating : null,
      startDate: insertBookLog.startDate !== undefined ? insertBookLog.startDate : null,
      finishDate: insertBookLog.finishDate !== undefined ? insertBookLog.finishDate : null,
    };
    this.bookLogs.set(`${bookLog.userId}-${bookLog.bookId}`, bookLog);
    return bookLog;
  }

  async updateBookLog(id: number, updates: Partial<BookLog>): Promise<BookLog | undefined> {
    const bookLog = Array.from(this.bookLogs.values()).find(log => log.id === id);
    if (!bookLog) return undefined;
    
    const updatedBookLog = { ...bookLog, ...updates };
    this.bookLogs.set(`${bookLog.userId}-${bookLog.bookId}`, updatedBookLog);
    return updatedBookLog;
  }

  async getUserBookLogs(userId: number, status?: string): Promise<BookLog[]> {
    const userLogs = Array.from(this.bookLogs.values()).filter(log => log.userId === userId);
    if (status) {
      return userLogs.filter(log => log.status === status);
    }
    return userLogs.sort((a, b) => {
      const bTime = b.createdAt ? b.createdAt.getTime() : 0;
      const aTime = a.createdAt ? a.createdAt.getTime() : 0;
      return bTime - aTime;
    });
  }

  // Achievement methods
  async getAchievements(): Promise<Achievement[]> {
    return Array.from(this.achievements.values()).filter(achievement => achievement.isActive);
  }

  async getUserAchievements(userId: number): Promise<UserAchievement[]> {
    return Array.from(this.userAchievements.values()).filter(ua => ua.userId === userId);
  }

  async createAchievement(insertAchievement: InsertAchievement): Promise<Achievement> {
    const achievement: Achievement = {
      ...insertAchievement,
      id: this.currentAchievementId++,
      requirement: insertAchievement.requirement,
      isActive: insertAchievement.isActive ?? true,
    };
    this.achievements.set(achievement.id, achievement);
    return achievement;
  }

  async updateUserAchievement(userId: number, achievementId: number, progress: number): Promise<UserAchievement | undefined> {
    const key = `${userId}-${achievementId}`;
    let userAchievement = this.userAchievements.get(key);
    
    if (!userAchievement) {
      userAchievement = {
        id: this.currentUserAchievementId++,
        userId,
        achievementId,
        progress: 0,
        isUnlocked: false,
        unlockedAt: null,
        createdAt: new Date(),
      };
    }
    
    userAchievement.progress = progress;
    this.userAchievements.set(key, userAchievement);
    return userAchievement;
  }

  async unlockAchievement(userId: number, achievementId: number): Promise<UserAchievement | undefined> {
    const key = `${userId}-${achievementId}`;
    const userAchievement = this.userAchievements.get(key);
    
    if (userAchievement && !userAchievement.isUnlocked) {
      userAchievement.isUnlocked = true;
      userAchievement.unlockedAt = new Date();
      this.userAchievements.set(key, userAchievement);
      
      // Award points to user
      const achievement = this.achievements.get(achievementId);
      if (achievement) {
        const user = this.users.get(userId);
        if (user) {
          user.points = (user.points ?? 0) + achievement.points;
          this.users.set(userId, user);
        }
      }
    }
    
    return userAchievement;
  }

  // Notification methods
  async getNotifications(userId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const notification: Notification = {
      id: this.currentNotificationId++,
      title: insertNotification.title,
      message: insertNotification.message,
      type: insertNotification.type,
      data: insertNotification.data ?? {},
      userId: insertNotification.userId ?? null,
      isRead: false,
      createdAt: new Date(),
    };
    this.notifications.set(notification.id, notification);
    return notification;
  }

  async markNotificationRead(id: number): Promise<boolean> {
    const notification = this.notifications.get(id);
    if (!notification) return false;
    
    notification.isRead = true;
    this.notifications.set(id, notification);
    return true;
  }

  // Content report methods
  async createContentReport(insertReport: InsertContentReport): Promise<ContentReport> {
    const report: ContentReport = {
      id: this.currentContentReportId++,
      createdAt: new Date(),
      description: insertReport.description !== undefined ? insertReport.description : null,
      postId: insertReport.postId !== undefined ? insertReport.postId : null,
      status: "pending",
      reporterId: insertReport.reporterId !== undefined ? insertReport.reporterId : null,
      reason: insertReport.reason,
      reviewedBy: null,
    };
    this.contentReports.set(report.id, report);
    return report;
  }

  async getContentReports(status?: string): Promise<ContentReport[]> {
    const reports = Array.from(this.contentReports.values());
    if (status) {
      return reports.filter(report => report.status === status);
    }
    return reports.sort((a, b) => {
      const bTime = b.createdAt ? b.createdAt.getTime() : 0;
      const aTime = a.createdAt ? a.createdAt.getTime() : 0;
      return bTime - aTime;
    });
  }

  async updateContentReport(id: number, updates: Partial<ContentReport>): Promise<ContentReport | undefined> {
    const report = this.contentReports.get(id);
    if (!report) return undefined;
    
    const updatedReport = { ...report, ...updates };
    this.contentReports.set(id, updatedReport);
    return updatedReport;
  }

  // Comment methods
  async getPostComments(postId: number): Promise<Comment[]> {
    return Array.from(this.comments.values())
      .filter(comment => comment.postId === postId)
      .sort((a, b) => {
        const aTime = a.createdAt ? a.createdAt.getTime() : 0;
        const bTime = b.createdAt ? b.createdAt.getTime() : 0;
        return aTime - bTime;
      });
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    const comment: Comment = {
      ...insertComment,
      id: this.currentCommentId++,
      createdAt: new Date(),
      userId: insertComment.userId !== undefined ? insertComment.userId : null,
      postId: insertComment.postId !== undefined ? insertComment.postId : null,
    };
    this.comments.set(comment.id, comment);
    
    // Update post comments count
    const post = this.posts.get(comment.postId ?? 0);
    if (post) {
      post.commentsCount = (post.commentsCount || 0) + 1;
      this.posts.set(post.id, post);
    }
    
    return comment;
  }

  // Analytics methods
  async getUserStats(userId: number): Promise<any> {
    const userPosts = await this.getUserPosts(userId);
    const userBookLogs = await this.getUserBookLogs(userId);
    const userAchievements = await this.getUserAchievements(userId);
    const followers = await this.getFollowers(userId);
    const following = await this.getFollowing(userId);
    
    return {
      postsCount: userPosts.length,
      booksRead: userBookLogs.filter(log => log.status === 'finished').length,
      achievementsUnlocked: userAchievements.filter(ua => ua.isUnlocked).length,
      totalPoints: userAchievements.reduce((sum, ua) => {
        if (ua.isUnlocked && ua.achievementId !== null) {
          const achievement = this.achievements.get(ua.achievementId);
          return sum + (achievement?.points || 0);
        }
        return sum;
      }, 0),
      followersCount: followers.length,
      followingCount: following.length,
      reviewsWritten: userPosts.filter(post => post.type === 'review').length,
    };
  }

  async getLeaderboard(limit = 10): Promise<User[]> {
    return Array.from(this.users.values())
      .sort((a, b) => b.points - a.points)
      .slice(0, limit);
  }
}

// Nicole: Using PostgreSQL database for production deployment
import { DatabaseStorage } from './db-storage-fixed';
export const storage = new DatabaseStorage();
