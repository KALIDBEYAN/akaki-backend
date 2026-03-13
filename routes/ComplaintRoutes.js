import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { submitComplaint, getAllComplaints, updateComplaintStatus, deleteComplaint } from "../controllers/ComplaintController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();
const uploadDir = 'uploads/complaints';

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } 
});

// የፍሮንት-ኢንዱ 'attachments' ከሚለው ጋር እንዲመሳሰል ተደርጓል
router.post("/submit", upload.array("attachments", 10), submitComplaint);

router.get("/all", protect, authorize("manager", "it"), getAllComplaints);
router.put("/status/:id", protect, authorize("manager","it"), updateComplaintStatus);
router.delete("/delete/:id", protect, authorize("manager","it"), deleteComplaint);

export default router;