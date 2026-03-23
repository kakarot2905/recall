import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import User from "@/models/User";
import { generateToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { accessToken, email, name, googleId } = await req.json();

    if (!accessToken || !email || !googleId) {
      return NextResponse.json(
        { error: "Google authentication data required" },
        { status: 400 },
      );
    }

    // Verify the access token by fetching userinfo — this endpoint
    // returns email for Chrome Extension tokens, unlike tokeninfo.
    const userInfoResponse = await fetch(
      `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`,
    );

    if (!userInfoResponse.ok) {
      return NextResponse.json(
        { error: "Invalid Google token" },
        { status: 401 },
      );
    }

    const userInfo = await userInfoResponse.json();

    // Cross-check the email reported by the client matches the token owner.
    if (!userInfo.email || userInfo.email !== email) {
      return NextResponse.json(
        { error: "Token email mismatch" },
        { status: 401 },
      );
    }

    // Use Google's sub (subject) as the canonical googleId for extra safety.
    const verifiedGoogleId = userInfo.sub || googleId;

    await connectDB();

    let user = await User.findOne({ googleId: verifiedGoogleId });

    if (!user) {
      user = await User.findOne({ email });

      if (user && !user.googleId) {
        user.googleId = verifiedGoogleId;
        if (!user.name) user.name = name || userInfo.name;
        await user.save();
      } else if (!user) {
        user = new User({
          email,
          name: name || userInfo.name,
          googleId: verifiedGoogleId,
        });
        await user.save();
      }
    }

    const token = generateToken(user._id.toString());

    return NextResponse.json({
      token,
      user: { id: user._id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error("Google auth error:", error);
    return NextResponse.json(
      { error: "Google authentication failed" },
      { status: 500 },
    );
  }
}
