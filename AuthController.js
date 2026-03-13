import User from "../models/User.js";
import jwt from "jsonwebtoken";

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// 1. ምዝገባ (Register)
export const register = async (req, res) => {
  try {
    const { fullName, username, password, role } = req.body;

    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: "ይህ መጠቀሚያ ስም ቀድሞ ተይዟል" });
    }

    const user = await User.create({
      fullName: fullName || "", 
      username,
      password,
      role: role || "expert",
    });

    // 🛑 ዋናው ለውጥ እዚህ ጋር ነው፡
    // ኩኪ መላኩን እና generateToken የሚለውን እናጠፋዋለን።
    // ምክንያቱም ይሄ ሬጅስትሬሽን ለአይቲ ፓነል ብቻ ስለሆነ።

    res.status(201).json({
      success: true,
      message: "ተጠቃሚው በተሳካ ሁኔታ ተመዝግቧል",
      user: { id: user._id, fullName: user.fullName, role: user.role, username: user.username }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "እባክዎ መለያ ስም እና የይለፍ ቃል ያስገቡ"
      });
    }

    const user = await User.findOne({ username }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "ተጠቃሚው በዚህ ስም አልተገኘም"
      });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "ፓስወርዱ ተሳስቷል"
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000
    });

    return res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        role: user.role,
        fullName: user.fullName
      }
    });

  } catch (error) {
    console.error("🔥 Login Controller Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Server Error"
    });
  }
};

// 3. መውጫ (Logout)
export const logout = (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: "በሰላም ወጥተዋል" });
};

// 4. መረጃ ማግኛ (getMe)
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "ተጠቃሚው አልተገኘም" });
    }
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// backend/controllers/AuthController.js

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "ዳታ መጫን አልተቻለም" });
  }
};

// የአይቲ ባለሙያው የራሱን ፕሮፋይል ለማደስ (ሙሉ ስም እና ፓስወርድ)
export const updateMe = async (req, res) => {
  try {
    const { fullName, password } = req.body;
    const user = await User.findById(req.user.id);

    if (fullName) user.fullName = fullName;
    if (password) user.password = password; // pre-save ሎጂኩ Hash ያደርገዋል

    await user.save();
    res.json({ success: true, message: "የእርስዎ መረጃ ታድሷል" });
  } catch (error) {
    res.status(400).json({ message: "ማዘመን አልተቻለም" });
  }
};

// የአይቲ ባለሙያው የሌሎችን ፓስወርድ Reset ለማድረግ
export const adminResetPassword = async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "ተጠቃሚው አልተገኘም" });

    user.password = newPassword;
    await user.save();
    res.json({ message: `${user.username} ፓስወርድ ተቀይሯል` });
  } catch (error) {
    res.status(400).json({ message: "መቀየር አልተቻለም" });
  }
};

// ተጠቃሚ ለመሰረዝ
export const deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "ተጠቃሚው ተሰርዟል" });
  } catch (error) {
    res.status(400).json({ message: "መሰረዝ አልተቻለም" });
  }
};
export const updateUserByAdmin = async (req, res) => {
  try {
    const { fullName, username, role, password } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "ተጠቃሚው አልተገኘም" });

    if (fullName) user.fullName = fullName;
    if (username) user.username = username;
    if (role) user.role = role;
    if (password) user.password = password; // Pre-save ሎጂኩ ሀሽ ያደርገዋል

    await user.save();
    res.json({ success: true, message: "መረጃው በስኬት ታድሷል" });
  } catch (error) {
    res.status(400).json({ message: "ማዘመን አልተቻለም" });
  }
};
