import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const fileSchema = new mongoose.Schema(
  {
    applicantName: { type: String, required: true, trim: true },
    ownerName: { type: String, required: true, trim: true },
    houseNo: { type: String, required: true, index: true },
    queue: { type: String },
    zone: { type: String },
    // models/File.js ውስጥ ያለውን services array እንዲህ ቀይረው
   services: [
        {
    serviceName: { type: String, required: true },
    status: { 
      type: String, 
      enum: ["pending", "assigned", "received", "completed", "verified", "rejected"], // "verified" ተጨምሯል
      default: "pending" 
          },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    expertName: { type: String, default: "" },
    adminComment: { type: String, default: "" },
    assignedAt: { type: Date }
      }
    ],
    status: { 
      type: String, 
      enum: ["pending", "rejected", "assigned", "received", "completed", "verified"], 
      default: "pending" 
    },
    // ስህተት ሲኖር የሚጻፍ አስተያየት
    adminComment: { type: String, default: "" }, 
    senderName: { type: String, default: "" },
    expertName: { type: String, default: "" },
    
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    fileCount: { type: Number,default: 0 },
    trackingId: { type: String, unique: true, index: true },
    history: [{ 
  status: String, 
  actionBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, 
  note: String, 
  createdAt: { type: Date, default: Date.now } 
  }]
  },
  { timestamps: true }
);

/**
 * 🛑 ማስተካከያ፦ 
 * 1. Arrow function (=>) በፍጹም መጠቀም የለብንም (ምክንያቱም 'this'ን ስለሚያጠፋው)።
 * 2. 'next' መኖሩን አረጋግጠን መጥራት አለብን።
 */
fileSchema.pre("save", function (next) {
  const file = this;

  if (file.isNew && !file.trackingId) {
   const shortId = uuidv4().split("-")[0].toUpperCase();
    file.trackingId = `AK-${new Date().getFullYear()}-${shortId}`;
  }
  
  // 'next' የሚባለው ፈንክሽን መኖሩን አረጋግጠህ ጥራው
  if (typeof next === 'function') {
    return next();
  }
});

export default mongoose.model("File", fileSchema);

