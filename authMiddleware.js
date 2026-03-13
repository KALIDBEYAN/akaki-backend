import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  let token = req.cookies.token; // HttpOnly Cookie በመጠቀም

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // ተጠቃሚው አሁንም ዳታቤዝ ውስጥ መኖሩን ማረጋገጥ
      req.user = await User.findById(decoded.id).select("-password");
      
      if (!req.user) {
        return res.status(401).json({ message: "ተጠቃሚው አልተገኘም፣ እባክዎ እንደገና ይግቡ" });
      }
      next();
    } catch (error) {
      res.status(401).json({ message: "ትክክለኛ ያልሆነ ቶከን" });
    }
  } else {
    res.status(401).json({ message: "ፍቃድ የሎትም፣ ቶከን አልተገኘም" });
  }
};

// የተወሰኑ ሮሎችን ብቻ ለመፍቀድ
export const authorize = (...roles) => {
  return (req, res, next) => {
    // 🛑 ችግሩ እዚህ ሊሆን ይችላል: req.user መኖሩን እና role በትክክል መያዙን ማረጋገጥ
    if (!req.user || !roles.includes(req.user.role)) {
      console.log(`Access Denied for role: ${req.user?.role}`); // ለዲበገን ይረዳሃል
      return res.status(403).json({ 
        success: false, 
        message: "ይህንን ገጽ ለመክፈት ፈቃድ የለዎትም!" 
      });
    }
    next();
  };
};
