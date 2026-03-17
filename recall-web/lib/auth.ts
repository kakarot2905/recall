import jwt from 'jsonwebtoken'
import { connectDB } from './mongoose'
import User from '@/models/User'
import { NextRequest } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export function generateToken(userId: string) {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
}

export async function authMiddleware(req: NextRequest) {
    const authHeader = req.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { error: 'No token provided', status: 401, user: null }
    }

    const token = authHeader.substring(7)

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
        await connectDB()
        const user = await User.findById(decoded.userId).select('-password')

        if (!user) {
            return { error: 'User not found', status: 401, user: null }
        }

        return { error: null, status: 200, user }
    } catch (error: any) {
        if (error.name === 'JsonWebTokenError') {
            return { error: 'Invalid token', status: 401, user: null }
        }
        if (error.name === 'TokenExpiredError') {
            return { error: 'Token expired', status: 401, user: null }
        }
        return { error: 'Authentication failed', status: 500, user: null }
    }
}