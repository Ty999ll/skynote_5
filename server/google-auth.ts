import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { storage } from './storage';
import bcrypt from 'bcryptjs';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export function configureGoogleAuth() {
  passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user exists with Google ID
      let user = await storage.getUserByGoogleId(profile.id);
      
      if (user) {
        // User exists, log them in
        return done(null, {
          id: user.id,
          username: user.username,
          email: user.email,
          isAdmin: user.isAdmin || false
        });
      }

      // Check if user exists with same email
      const email = profile.emails?.[0]?.value;
      if (email) {
        user = await storage.getUserByEmail(email);
        if (user) {
          // Link Google account to existing user
          await storage.updateUser(user.id, {
            googleId: profile.id,
            emailVerified: true // Google accounts are pre-verified
          });
          
          return done(null, {
            id: user.id,
            username: user.username,
            email: user.email,
            isAdmin: user.isAdmin || false
          });
        }
      }

      // Create new user from Google profile
      if (email) {
        const displayName = profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim();
        const username = email.split('@')[0] + Math.random().toString(36).substring(2, 5);
        
        const newUser = await storage.createUser({
          username,
          email,
          displayName,
          googleId: profile.id,
          emailVerified: true,
          avatar: profile.photos?.[0]?.value || null,
          password: null // No password for Google users
        });

        return done(null, {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          isAdmin: newUser.isAdmin || false
        });
      }

      return done(new Error('No email provided by Google'), null);
    } catch (error) {
      console.error('Google OAuth error:', error);
      return done(error, null);
    }
  }));
}

export function setupGoogleRoutes(app: any) {
  // Initiate Google OAuth
  app.get('/auth/google', 
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  // Google OAuth callback
  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login?error=oauth_failed' }),
    (req: any, res: any) => {
      // Successful authentication, redirect to home
      res.redirect('/');
    }
  );
}