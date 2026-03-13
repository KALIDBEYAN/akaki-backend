import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import path from "path"; // የታከለ
import { fileURLToPath } from 'url'; // የታከለ

// Routes
import authnRoutes from "./routes/AuthnRoutes.js";
import fileRoutes from "./routes/FileRoutes.js";
import managerRoutes from "./routes/ManagerRoutes.js";
import complaintRoutes from "./routes/ComplaintRoutes.js";

dotenv.config();
const __filename = fileURLToPath(import.meta.url); // የታከለ
const __dirname = path.dirname(__filename); // የታከለ

if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET አልተገኘም");
  process.exit(1);
}
connectDB();

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: false,
}));

app.use(cookieParser());

app.use(cors({ 
  origin: ["https://akaki-frontend.onrender.com", "http://localhost:5173"], // የሬንደር እና የሎካል ሊንክ
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: '2mb' }));

// 🛑 Static Folder setup (ለቅሬታ ፋይሎች ማሳያ)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use("/api/auth", authnRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/manager", managerRoutes);
app.use("/api/complaints", complaintRoutes);

// Error Handling
app.use((err, req, res, next) => {
  console.error("🔥 Error Stack:", err.stack);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'የውስጥ ሰርቨር ስህተት አጋጥሟል'
  });
});
app.get("/hello", (req, res) => {
  res.json({ message: "ሰላም! ሰርቨሩ በትክክል እየሰራ ነው" });
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));  
