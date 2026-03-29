import mongoose from "mongoose";

const blockedUserSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    ownerName: { type: String, required: true },
    houseNo: { type: String, required: true },
    zone: { type: String },
    reason: { type: String, },
    attachedFile: { type: String, default: null },
    status: { type: String, enum: ["blocked", "unblocked"], default: "blocked" }
}, { timestamps: true });

// ይህ መስመር መኖሩን አረጋግጥ (export default መሆኑ በጣም ወሳኝ ነው)
const BlockedUser = mongoose.model("BlockedUser", blockedUserSchema);
export default BlockedUser;
