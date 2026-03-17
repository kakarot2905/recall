import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongoose'
import User from '@/models/User'
import { generateToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
    try {
        const { accessToken, email, name, googleId } = await req.json()

        if (!accessToken || !email || !googleId) {
            return NextResponse.json(
                { error: 'Google authentication data required' },
                { status: 400 }
            )
        }

        const verifyResponse = await fetch(
            `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${accessToken}`
        )

        if (!verifyResponse.ok) {
            return NextResponse.json(
                { error: 'Invalid Google token' },
                { status: 401 }
            )
        }

        const tokenInfo = await verifyResponse.json()

        if (tokenInfo.email !== email) {
            return NextResponse.json(
                { error: 'Token email mismatch' },
                { status: 401 }
            )
        }

        await connectDB()

        let user = await User.findOne({ googleId })

        if (!user) {
            user = await User.findOne({ email })

            if (user && !user.googleId) {
                user.googleId = googleId
                if (!user.name) user.name = name
                await user.save()
            } else if (!user) {
                user = new User({ email, name, googleId })
                await user.save()
            }
        }

        const token = generateToken(user._id.toString())

        return NextResponse.json({
            token,
            user: { id: user._id, email: user.email, name: user.name }
        })
    } catch (error) {
        console.error('Google auth error:', error)
        return NextResponse.json(
            { error: 'Google authentication failed' },
            { status: 500 }
        )
    }
}