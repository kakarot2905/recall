import express from 'express';
import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';
import { OAuth2Client } from 'google-auth-library';

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * POST /api/auth/register
 * Register with email and password
 */
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        console.log('[Auth] Register attempt', { email, hasPassword: Boolean(password) });

        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Email, password, and name are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const user = new User({
            email,
            password,
            name
        });

        await user.save();
        console.log('[Auth] User registered', { userId: user._id, email });

        const token = generateToken(user._id);

        res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log('[Auth] Login attempt', { email });

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (!user.password) {
            return res.status(401).json({ error: 'Please login with Google' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        console.log('[Auth] Login successful', { userId: user._id, email });

        const token = generateToken(user._id);

        res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

/**
 * POST /api/auth/google
 * Login/Register with Google
 */
router.post('/google', async (req, res) => {
    try {
        const { accessToken, email, name, googleId } = req.body;

        console.log('[Auth] Google login attempt', { email });

        if (!accessToken || !email || !googleId) {
            return res.status(400).json({ error: 'Google authentication data required' });
        }

        // Verify the access token with Google
        try {
            const verifyResponse = await fetch(
                `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${accessToken}`
            );

            if (!verifyResponse.ok) {
                return res.status(401).json({ error: 'Invalid Google token' });
            }

            const tokenInfo = await verifyResponse.json();

            // Verify the email matches
            if (tokenInfo.email !== email) {
                return res.status(401).json({ error: 'Token email mismatch' });
            }
        } catch (verifyError) {
            console.error('[Auth] Google token verification failed:', verifyError);
            return res.status(401).json({ error: 'Failed to verify Google token' });
        }

        // Find or create user
        let user = await User.findOne({ googleId });

        if (!user) {
            user = await User.findOne({ email });

            if (user && !user.googleId) {
                // Link existing email account with Google
                user.googleId = googleId;
                if (!user.name) user.name = name;
                await user.save();
                console.log('[Auth] Linked existing account with Google', { userId: user._id, email });
            } else if (!user) {
                // Create new user
                user = new User({
                    email,
                    name,
                    googleId
                });
                await user.save();
                console.log('[Auth] New user via Google', { userId: user._id, email });
            }
        }

        console.log('[Auth] Google login successful', { userId: user._id, email });

        const token = generateToken(user._id);

        res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name
            }
        });
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(500).json({ error: 'Google authentication failed' });
    }
});

export default router;
