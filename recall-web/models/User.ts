import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: function (this: any) { return !this.googleId } },
    googleId: { type: String, sparse: true, unique: true },
    name: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
})

userSchema.pre('save', async function () {
    if (!this.isModified('password') || !this.password) return
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
})

userSchema.methods.comparePassword = async function (candidatePassword: string) {
    if (!this.password) return false
    return bcrypt.compare(candidatePassword, this.password)
}

export default mongoose.models.User || mongoose.model('User', userSchema)