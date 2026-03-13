import express from "express";
import { 
  register, login, logout, getMe, 
  getAllUsers, updateMe, adminResetPassword, deleteUser ,updateUserByAdmin
} from "../controllers/AuthController.js"; 
import { protect, authorize } from "../middleware/authMiddleware.js";


const router = express.Router();

// 🛠 IT/Admin ብቻ የሚጠቀሙባቸው ራውቶች
// ማሳሰቢያ፡ authorize ሁልጊዜ ከ protect በኋላ መምጣት አለበት
// 🛠 IT ባለሙያ ብቻ የሚቆጣጠራቸው (Full Control)
router.get("/users", protect, authorize("it"), getAllUsers);

router.put("/admin/update-user/:id", protect, authorize("it"), updateUserByAdmin);
router.put("/admin/reset-password", protect, authorize("it"), adminResetPassword);
router.delete("/users/:id", protect, authorize("it"), deleteUser);

// 👤 ማንኛውም የገባ ተጠቃሚ የራሱን መረጃ ማደስ ይችላል
router.put("/update-me", protect, updateMe);

// 🔓 Public Routes (ያልገቡ ሰዎች የሚጠቀሙት)
router.post("/register",  protect, authorize("it"), register);
router.post("/login", login);
router.post("/logout", logout);

// 🔐 የገባው ሰው መረጃውን ለማግኘት
router.get("/me", protect, getMe);

export default router;
