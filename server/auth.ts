import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { storage } from "./storage";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import type { User } from "@shared/schema";
import ConnectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { sendPasswordResetEmail } from "./brevo";

const PgSession = ConnectPgSimple(session);

const hashPassword = (password: string, salt: string) => {
  return scryptSync(password, salt, 64).toString("hex");
};

export const setupAuth = (app: Express) => {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable must be set");
  }

  const isProduction = app.get("env") === "production";
  console.log("[Auth Setup] Environment:", app.get("env"), "NODE_ENV:", process.env.NODE_ENV, "Production mode:", isProduction);

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET,
    resave: true,  // Changed to true to ensure session is saved on every request
    saveUninitialized: false,
    rolling: true,  // Reset cookie maxAge on every request
    store: new PgSession({
      pool,
      tableName: "sessions",
      createTableIfMissing: false,
    }),
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: false,  // Force to false for now to debug
      sameSite: "lax",
      path: "/",  // Explicitly set path
    },
  };

  console.log("[Auth Setup] Cookie settings:", JSON.stringify(sessionSettings.cookie, null, 2));

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user) {
            return done(null, false, { message: "Incorrect email or password" });
          }

          if (!user.passwordHash) {
            return done(null, false, { message: "Please sign in with Google" });
          }

          const [salt, hash] = user.passwordHash.split(":");
          const inputHash = hashPassword(password, salt);
          const hashBuffer = Buffer.from(hash, "hex");
          const inputBuffer = Buffer.from(inputHash, "hex");

          if (!timingSafeEqual(hashBuffer, inputBuffer)) {
            return done(null, false, { message: "Incorrect email or password" });
          }

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    // For now, use the Replit dev URL since that's where requests are actually coming from
    let googleCallbackURL = "http://localhost:5000/api/auth/google/callback";
    
    if (process.env.REPLIT_DOMAINS) {
      const domains = process.env.REPLIT_DOMAINS.split(",");
      googleCallbackURL = `https://${domains[0]}/api/auth/google/callback`;
    }

    console.log(`[Google OAuth] Using callback URL: ${googleCallbackURL}`);

    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: googleCallbackURL,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error("No email from Google"));
            }

            let user = await storage.getUserByProvider("google", profile.id);

            if (!user) {
              user = await storage.getUserByEmail(email);

              if (user && user.provider === "local") {
                return done(null, false, {
                  message:
                    "Email already registered with password. Please sign in with email and password.",
                });
              }
            }

            if (!user) {
              const organization = await storage.createOrganization({
                name: `${profile.displayName || email}'s Organization`,
              });

              user = await storage.createUser({
                email,
                name: profile.displayName || email,
                role: "admin",
                organizationId: organization.id,
                provider: "google",
                providerId: profile.id,
                passwordHash: null,
              });
            }

            return done(null, user);
          } catch (err) {
            return done(err);
          }
        }
      )
    );
  }

  passport.serializeUser((user: Express.User, done) => {
    done(null, (user as User).id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUserById(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const { email, password, name, organizationName } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ error: "Email, password, and name are required" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const organization = await storage.createOrganization({
        name: organizationName || `${name}'s Organization`,
      });

      const salt = randomBytes(16).toString("hex");
      const hash = hashPassword(password, salt);

      const user = await storage.createUser({
        email,
        passwordHash: `${salt}:${hash}`,
        name,
        role: "admin",
        organizationId: organization.id,
      });

      req.login(user, (err) => {
        if (err) {
          return next(err);
        }

        // Let the session middleware handle saving (resave: true)
        return res.json({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    console.log("[Auth] Login attempt for:", req.body.email);
    passport.authenticate("local", (err: any, user: User | false, info: any) => {
      if (err) {
        console.error("[Auth] Login authentication error:", err);
        return res.status(500).json({ error: "Internal server error" });
      }

      if (!user) {
        console.log("[Auth] Login failed for:", req.body.email, "Reason:", info?.message);
        return res.status(401).json({ error: info?.message || "Invalid email or password" });
      }

      console.log("[Auth] User authenticated:", user.email);
      req.login(user, (err) => {
        if (err) {
          console.error("[Auth] Login session error:", err);
          return res.status(500).json({ error: "Login failed" });
        }

        console.log("[Auth] Session created, session ID:", req.sessionID);
        
        // Let the session middleware handle saving (resave: true)
        return res.json({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
        });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Health check endpoint for debugging production issues
  app.get("/api/auth/health", async (req, res) => {
    try {
      const checks = {
        sessionSecret: !!process.env.SESSION_SECRET,
        databaseUrl: !!process.env.DATABASE_URL,
        environment: process.env.NODE_ENV || 'development',
        sessionStoreConnected: false,
        canQueryDatabase: false,
      };

      // Test database connection
      try {
        const testUser = await storage.getUserByEmail('test@example.com');
        checks.canQueryDatabase = true;
      } catch (err) {
        console.error('Health check - database query failed:', err);
      }

      // Test session store (it's connected if we got this far)
      checks.sessionStoreConnected = true;

      res.json(checks);
    } catch (error) {
      console.error('Health check error:', error);
      res.status(500).json({ error: 'Health check failed', details: String(error) });
    }
  });

  app.get("/api/auth/me", (req, res) => {
    console.log("[Auth] /me check - Session ID:", req.sessionID, "Authenticated:", req.isAuthenticated());
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const user = req.user as User;
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
    });
  });

  // Google OAuth routes
  app.get("/api/auth/google", (req, res, next) => {
    console.log("[Google OAuth] Initiating Google login from:", req.headers.host);
    console.log("[Google OAuth] User-Agent:", req.headers["user-agent"]);
    passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
  });

  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login" }),
    (req, res) => {
      res.redirect("/");
    }
  );

  // Password reset endpoints
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);

      if (!user) {
        return res.json({ message: "If the email exists, a reset link has been sent" });
      }

      if (user.provider !== "local") {
        return res
          .status(400)
          .json({ error: "This account uses Google sign-in. No password reset needed." });
      }

      await storage.deleteExpiredPasswordResetTokens();

      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await storage.createPasswordResetToken(user.id, token, expiresAt);

      const resetLink = `${req.protocol}://${req.get("host")}/reset-password?token=${token}`;

      try {
        await sendPasswordResetEmail({
          toEmail: user.email,
          toName: user.name,
          resetLink,
        });
        res.json({ message: "If the email exists, a reset link has been sent" });
      } catch (emailError) {
        console.error("Failed to send password reset email:", emailError);
        // In development, return the reset link directly so user can still reset password
        if (process.env.NODE_ENV !== "production") {
          return res.json({
            message: "Email service unavailable. Use this link to reset your password:",
            resetLink: resetLink,
          });
        }
        // In production, still return success message for security
        res.json({ message: "If the email exists, a reset link has been sent" });
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Failed to process request" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ error: "Token and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      const resetToken = await storage.getPasswordResetToken(token);

      if (!resetToken) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      if (resetToken.expiresAt < new Date()) {
        await storage.deletePasswordResetToken(token);
        return res.status(400).json({ error: "Reset token has expired" });
      }

      const salt = randomBytes(16).toString("hex");
      const hash = hashPassword(newPassword, salt);

      await storage.updateUser(resetToken.userId, {
        passwordHash: `${salt}:${hash}`,
      });

      await storage.deletePasswordResetToken(token);

      res.json({ message: "Password successfully reset" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

declare module "express-serve-static-core" {
  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    organizationId: string | null;
  }
}
