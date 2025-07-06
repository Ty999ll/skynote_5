import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { storage } from './storage';
import { emailService } from './email';

// Configure Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/api/auth/google/callback'
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      const displayName = profile.displayName;
      const googleId = profile.id;
      const avatar = profile.photos?.[0]?.value;

      if (!email) {
        return done(new Error('No email found in Google profile'));
      }

      // Check if user exists by email
      let user = await storage.getUserByEmail(email);

      if (user) {
        // If user exists but doesn't have Google ID, link the account
        if (!user.googleId) {
          user = await storage.updateUser(user.id, {
            googleId,
            authProvider: 'google',
            emailVerified: true,
            avatar: avatar || user.avatar
          });
        }
      } else {
        // Create new user with Google account
        const username = email.split('@')[0] + Math.floor(Math.random() * 1000);
        user = await storage.createUser({
          username,
          email,
          displayName,
          googleId,
          authProvider: 'google',
          emailVerified: true,
          avatar
        });
      }

      return done(null, user);
    } catch (error) {
      console.error('Google OAuth error:', error);
      return done(error);
    }
  }));
} else {
  console.log('Google OAuth not configured - missing CLIENT_ID or CLIENT_SECRET');
}

// Passport serialization
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export default passport;