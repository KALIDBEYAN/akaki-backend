import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String,required: false },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["manager", "admin", "expert","it"],
      default: "expert",
    },
  },
  { timestamps: true }
);

// ዳታ ከመቀመጡ በፊት ፓስወርድን Hash ለማድረግ
// User.js
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// የገባውን ፓስወርድ ከዳታቤዙ ጋር ለማወዳደር (ስሙ ተስተካክሏል)
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ዳታ ወደ JSON ሲቀየር ፓስወርድ እንዳይወጣ
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    return ret;
  }
});

const User = mongoose.model("User", userSchema);
export default User;
