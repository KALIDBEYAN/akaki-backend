import express from "express";
import {
  deleteFileData,
  deleteComplaint,
  deleteBlockedUser,
  blockUser,
  getBlockedUsers,
  clearAllData
} from "../controllers/ManagerController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { assignFile, rejectFile } from "../controllers/ManagerController.js";
import multer from "multer";
import { storage } from "../config/cloudinary.js";


const upload = multer({ storage: storage });


const router = express.Router();

// 1. የፋይል ምደባ እና ውሳኔዎች
router.put("/assign-file", assignFile); // ለመመደብ
router.put("/reject-file", rejectFile); // ለአስተካክል (ለመመለስ)
router.post("/block-user", upload.single('fileObject'), blockUser);
router.get("/blocked-users", getBlockedUsers);

// 🔐 ሁሉም የማናጀር ስራዎች ጥበቃ ይደረግባቸዋል
router.use(protect);
router.use(authorize("manager","it", "admin"));

// 🗑️ የማጥፋት ስራዎች
router.delete("/delete-file/:id", deleteFileData);
router.delete("/delete-complaint/:id", deleteComplaint);
router.delete("/delete-blocked/:id", deleteBlockedUser);
router.delete("/clear-all", clearAllData);

// 🚫 እግድ እና ዝርዝር የማየት ስራዎች
// ማሳሰቢያ፡ እዚህ ጋር የነበረው ድግግሞሽ ተስተካክሎ በአንድ መስመር በ Multer እንዲሰራ ተደርጓል

export default router;
