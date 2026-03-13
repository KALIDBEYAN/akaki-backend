import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const complaintSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { 
      type: String,
      required: [true, "ስልክ ቁጥር ያስፈልጋል"],
      match: [/^(\+2519|\+2517|09|07)[0-9]{8}$/, "እባክዎ ትክክለኛ የኢትዮጵያ ስልክ ቁጥር ያስገቡ"]
    },
    city: { type: String, trim: true },
    subCity: { type: String, trim: true },
    woreda: { type: String, trim: true },
    subject: { type: String,  },
    description: { type: String },
    complaintType: { type: [String], default: [] },
    // ፋይሎችን ለየብቻ የምንይዝባቸው ፊልዶች
    files: { type: [String], default: [] }, // ለፎቶ እና ሰነድ
    audio: { type: String, default: "" },
    video: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "in-progress", "resolved", "rejected"],
      default: "pending"
    },
    managerNote: { type: String, default: "" },
    trackingId: { type: String, unique: true }
  },
  { timestamps: true }
);

// Tracking ID በራሱ እንዲመነጭ (CMP-2024-XXXX)
complaintSchema.pre("save", function () {
  if (this.isNew && !this.trackingId) {
    const year = new Date().getFullYear();
    const uniqueId = uuidv4().split("-")[0];
    this.trackingId = `CMP-${year}-${uniqueId}`;
  }
  
});

export default mongoose.model("Complaint", complaintSchema);

