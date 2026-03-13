import express from "express";
import {
  createFile, getFiles, deleteFile, assignFile, getallFiles,
  expertReceive, expertReturn, approveFile, updateFileStatus, updateFileData
} from "../controllers/FileController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

/*
============================
 PUBLIC ROUTES (Guest Access)
============================
*/

router.post("/", createFile);
router.get("/public", getallFiles);
router.get("/status/:id", updateFileStatus);
router.put("/update-file/:id", updateFileData);

/*
============================
 AUTHENTICATED ROUTES
============================
*/

router.get("/", protect, getFiles);

router.delete("/:id", protect, authorize("admin", "manager", "it"), deleteFile);
router.put("/assign/:id", protect, authorize("admin", "manager", "it"), assignFile);
router.put("/approve/:id", protect, authorize("admin", "manager", "it"), approveFile);
router.put("/receive/:id", protect, authorize("expert", "manager", "it"), expertReceive);
router.put("/return/:id", protect, authorize("expert", "manager", "it"), expertReturn);

export default router;