import express from "express";
import {
  createFile, getFiles, deleteFile, assignFile, getallFiles,
  expertReceive, expertReturn,  updateFileStatus, updateFileData,verifyService,
  rejectService,rejectFile,deleteService
} from "../controllers/FileController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", createFile); 
router.get("/public", getallFiles); 
router.patch("/status/:id", updateFileStatus);

router.delete("/delete-service/:id/:serviceId", protect, deleteService);
router.patch("/reject-file/:id", protect, authorize("admin", "manager", "it"), rejectFile);
router.patch("/verify/:id/:serviceId", protect, authorize("admin", "manager", "it"), verifyService);
router.patch("/reject/:id/:serviceId", protect, authorize("admin", "manager", "it"), rejectService);
router.patch("/assign/:id/:serviceId", protect, authorize("admin", "manager", "it"), assignFile);
router.patch("/receive/:id/:serviceId", protect, authorize("expert", "manager", "it"), expertReceive);
router.patch("/return/:id/:serviceId", protect, authorize("expert", "manager", "it"), expertReturn);
router.get("/", protect, getFiles); 
router.put("/update-file/:id", protect, updateFileData); 
router.delete("/:id", protect, authorize("admin", "manager", "it"), deleteFile); 

export default router;