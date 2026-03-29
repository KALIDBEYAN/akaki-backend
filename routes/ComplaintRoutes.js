import express from "express";
import multer from "multer";
import { storage } from "../config/cloudinary.js"; 
import { 
  submitComplaint, 
  getAllComplaints, 
  updateComplaintStatus, 
  deleteComplaint 
} from "../controllers/ComplaintController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

const upload = multer({ 
  storage: storage, 
  limits: { fileSize: 100 * 1024 * 1024 } 
});


router.post("/submit", upload.array("attachments", 10), submitComplaint);
router.get("/all", protect, authorize("manager", "it"), getAllComplaints);
router.put("/status/:id", protect, authorize("manager", "it"), updateComplaintStatus);
router.delete("/delete/:id", protect, authorize("manager", "it"), deleteComplaint);

export default router;