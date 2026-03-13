import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const fileSchema = new mongoose.Schema(
  {
    applicantName: { type: String, required: true, trim: true },
    ownerName: { type: String, required: true, trim: true },
    houseNo: { type: String, required: true, index: true },
    queue: { type: String },
    zone: { type: String },
    service: { type: String, required: true },
    status: { 
      type: String, 
      enum: ["pending", "rejected", "assigned", "received", "completed", "verified"], 
      default: "pending" 
    },
    // ስህተት ሲኖር የሚጻፍ አስተያየት
    adminComment: { type: String, default: "" }, 
    senderName: { type: String, default: "" },
    expertName: { type: String, default: "" },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" ,default: null},
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    trackingId: { type: String, unique: true, index: true },
    history: [{ status: String, actionBy: String, note: String, createdAt: { type: Date, default: Date.now } }]
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
    file.trackingId = `AK-${new Date().getFullYear()}-${uuidv4().split("-")[0]}`;
  }
  
  // 'next' የሚባለው ፈንክሽን መኖሩን አረጋግጠህ ጥራው
  if (typeof next === 'function') {
    return next();
  }
});

export default mongoose.model("File", fileSchema);

