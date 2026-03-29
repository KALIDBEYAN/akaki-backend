import File from "../models/File.js";
import Complaint from "../models/Complaint.js";
import BlockedUser from "../models/BlockedUser.js";

/* ===========================================================
   1. የፋይል አስተዳደር (FILE MANAGEMENT)
=========================================================== */

// ፋይልን በቋሚነት ማጥፋት
export const deleteFileData = async (req, res) => {
  try {
    const deleted = await File.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "ፋይሉ አልተገኘም" });
    }
    res.json({ success: true, message: "ፋይሉ በስኬት ተሰርዟል" });
  } catch (error) {
    res.status(500).json({ success: false, message: "ስህተት አጋጥሟል: " + error.message });
  }
};

// ሁሉንም መረጃዎች በአንድ ጊዜ ማጽዳት (ለጥንቃቄ)
export const clearAllData = async (req, res) => {
  try {
    await File.deleteMany({});
    await Complaint.deleteMany({});
    res.status(200).json({ 
      success: true, 
      message: "ሁሉም የፋይል እና የቅሬታ መረጃዎች በስኬት ተሰርዘዋል" 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "መረጃዎችን ማጥፋት አልተቻለም" });
  }
};

/* ===========================================================
   2. የቅሬታ አስተዳደር (COMPLAINT MANAGEMENT)
=========================================================== */

// ቅሬታን ማጥፋት
export const deleteComplaint = async (req, res) => {
  try {
    const deleted = await Complaint.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "ቅሬታው አልተገኘም" });
    }
    res.json({ success: true, message: "ቅሬታው ተሰርዟል" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ===========================================================
   3. የታገዱ ተጠቃሚዎች አስተዳደር (BLOCK LIST MANAGEMENT)
=========================================================== */

// አዲስ ሰው ማገድ
export const blockUser = async (req, res) => {
  try {
    const { fullName, ownerName, houseNo, reason, zone } = req.body;
    
    if (!fullName || !ownerName || !houseNo) {
      return res.status(400).json({ 
        success: false, 
        message: "እባክዎ ስም፣ የባለቤት ስም እና የቤት ቁጥር በትክክል ያስገቡ" 
      });
    }
     const existing = await BlockedUser.findOne({ 
        fullName: fullName.toLowerCase().trim(), 
        ownerName: ownerName.toLowerCase().trim(), 
        houseNo: houseNo.trim() 
    });
    
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: "ይህ ተገልጋይ (በዚህ ስም፣ ባለቤት እና ቤት ቁጥር) አስቀድሞ በእግድ ዝርዝር ውስጥ ይገኛል" 
      });
    }
    const attachedFile = req.file ? req.file.path  : null;

    const block = await BlockedUser.create({
      fullName: fullName.trim().toLowerCase(),
      ownerName: ownerName.trim().toLowerCase(),
      houseNo: houseNo.trim(),
      zone: zone,
      reason: reason || "ምክንያት አልተጠቀሰም",
      attachedFile: attachedFile 
    });

    res.status(201).json({ success: true, data: block });
  } catch (error) {
    res.status(500).json({ success: false, message: "ማገድ አልተቻለም: " + error.message });
  }
};

// የታገዱ ሰዎችን ዝርዝር ማግኘት
export const getBlockedUsers = async (req, res) => {
  try {
    const users = await BlockedUser.find().sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: "ዝርዝሩን ማምጣት አልተቻለም" });
  }
};

// ከእግድ ማንሳት (መሰረዝ)
export const deleteBlockedUser = async (req, res) => {
  try {
    const deleted = await BlockedUser.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "ተጠቃሚው አልተገኘም" });
    }
    res.json({ success: true, message: "ተጠቃሚው ከእግድ ተነስቷል" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ===========================================================
   4. የፋይል ምደባ እና ውሳኔዎች
=========================================================== */

export const assignFile = async (req, res) => {
  try {
    const { fileId, senderName, expertName } = req.body;
    const updatedFile = await File.findByIdAndUpdate(
      fileId,
      {
        status: "assigned",
        assignedTo: null,
        senderName: senderName,
        expertName: expertName,
        adminComment: "",
        $push: { 
          history: { status: "assigned", actionBy: senderName, 
            note: `ፋይሉ በ${senderName} አማካኝነት ለ${expertName} ተመድቧል` } 
        }
      },
      { returnDocument: 'after'}
    );

    if (!updatedFile) return res.status(404).json({ message: "ፋይሉ አልተገኘም" });
    res.status(200).json(updatedFile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const rejectFile = async (req, res) => {
  try {
    const { fileId, reason, adminName } = req.body;
    const updatedFile = await File.findByIdAndUpdate(
      fileId,
      {
        status: "rejected",
        adminComment: reason,
        $push: { 
          history: { status: "rejected", actionBy: adminName, note: reason } 
        }
      },
      { returnDocument: 'after' }
    );

    if (!updatedFile) return res.status(404).json({ message: "ፋይሉ አልተገኘም" });
    res.status(200).json(updatedFile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
