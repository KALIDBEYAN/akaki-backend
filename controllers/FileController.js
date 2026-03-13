import FileModel from "../models/File.js";
import BlockedUser from "../models/BlockedUser.js";
import mongoose from "mongoose";
// 🔹 ስምን ነጥሎ ለማውጣት (Normalization)
const normalizeName = (name) => {
  if (!name) return "";
  // ክፍተቶችን ማጽዳት፣ ወደ ትናንሽ ሆሄ መለወጥ እና የመጀመሪያዎቹን 2 ስሞች መውሰድ
  return name.trim().toLowerCase().split(/\s+/).slice(0, 2).join(" ");
};

// 🔹 አዲስ ፋይል መመዝገብ (With Transaction & Advanced Blocking)
export const createFile = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { applicantName, ownerName, houseNo } = req.body;

    // ሀ. የእግድ ፍተሻ (Regex + Normalization)
    const blockedList = await BlockedUser.find({ 
        status: "blocked",
        $or: [
            { fullName: { $regex: applicantName, $options: "i" } },
            { ownerName: { $regex: ownerName, $options: "i" } },
            { houseNo: houseNo }
        ]
    }).session(session);

    const isBlocked = blockedList.some(b => {
      const normApp = normalizeName(applicantName); 
      const normOwner = normalizeName(ownerName);   
      const normBlockedFull = normalizeName(b.fullName);
      const normBlockedOwner = normalizeName(b.ownerName);
      
      const normHouse = houseNo ? houseNo.toLowerCase().replace(/\s/g, '') : "";
      const normBlockedHouse = b.houseNo ? b.houseNo.toLowerCase().replace(/\s/g, '') : "";

      return (normApp === normBlockedFull || normOwner === normBlockedOwner) && 
             normHouse === normBlockedHouse;
    });

    if (isBlocked) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        success: false,
        message: "ይህ አመልካች ወይም የቤት ቁጥር የታገዱ በመሆናቸው ማመልከት አይቻሉም!"
      });
    }

    // ለ. ፋይሉን መመዝገብ
    const newFile = new FileModel({ 
      ...req.body, 
      status: "pending",
      createdBy: req.user ? req.user.id : null 
    });

    await newFile.save({ session });

    await session.commitTransaction();
    session.endSession();
    return res.status(201).json({ success: true, data: newFile });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Create File Error:", error);
    return res.status(500).json({ success: false, message: "መረጃውን መመዝገብ አልተቻለም", error: error.message });
  }
};

// 🔹 የፋይል ሁኔታን ለማዘመን (With Transaction)
export const updateFileStatus = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    // 🛑 እዚህ ጋር FileModel የሚለውን መጠቀም አለብህ
    const file = await FileModel.findById(id).session(session);

    if (!file) {
      throw new Error("ፋይሉ አልተገኘም");
    }

    // ለውጦችን ማካተት
    if (req.body.status) file.status = req.body.status;
    if (req.body.assignedTo) file.assignedTo = req.body.assignedTo;
    if (req.body.adminComment) file.adminComment = req.body.adminComment;
    
    await file.save({ session });

    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ success: true, message: "በስኬት ተዘምኗል", data: file });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: error.message || "ማዘመን አልተቻለም" });
  }
};

// 🔹 ሁሉንም ፋይሎች ማየት (ከነ ባለሙያ ስም)
export const getFiles = async (req, res) => {
  try {
    const files = await FileModel.find()
      .sort({ createdAt: -1 })
      .populate("assignedTo", "fullName role"); // ባለሙያውን ፖፑሌት ያደርጋል
    return res.json(files);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 🔹 ፋይል ለባለሙያ መመደብ
export const assignFile = async (req, res) => {
  try {
    const { expertId, expertName } = req.body;
    const file = await FileModel.findByIdAndUpdate(
      req.params.id,
      { status: "assigned", assignedTo: expertId, expertName, assignedAt: new Date() },
      { returnDocument: 'after'}
    );
    return res.json({ success: true, data: file });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 🔹 ባለሙያ ሲረከብ
export const expertReceive = async (req, res) => {
  try {
    const file = await FileModel.findByIdAndUpdate(req.params.id, { status: "received" }, { returnDocument: 'after' });
    return res.json({ success: true, data: file });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 🔹 ባለሙያ ሥራውን ሲያጠናቅቅ
export const expertReturn = async (req, res) => {
  try {
    const file = await FileModel.findByIdAndUpdate(req.params.id, { status: "completed" }, { returnDocument: 'after'});
    return res.json({ success: true, data: file });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 🔹 ማጽደቅ
export const approveFile = async (req, res) => {
  try {
    const file = await FileModel.findByIdAndUpdate(req.params.id, { status: "verified" }, { returnDocument: 'after' });
    return res.json({ success: true, data: file });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 🔹 ፋይል ማጥፋት
export const deleteFile = async (req, res) => {
  try {
    await FileModel.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: "ተሰርዟል" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 🔹 ፋይልን ለማዘመን (Admin Action)
export const updateFile = async (req, res) => {
  try {
    const { status, adminComment, senderName, expertName, assignedTo } = req.body;
    
    const updatedFile = await FileModel.findByIdAndUpdate(
      req.params.id,
      { 
        status, 
        adminComment, 
        senderName,   
        expertName,   
        assignedTo    
      },
      { returnDocument: 'after'}
    );

    res.status(200).json(updatedFile);
  } catch (error) {
    res.status(500).json({ message: "መረጃውን ማዘመን አልተቻለም" });
  }
};

// 🔹 የፋይል ዳታን ለማስተካከል (Edit Mode)
export const updateFileData = async (req, res) => {
  try {
    const updatedFile = await FileModel.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      {returnDocument: 'after'}
    );
    if (!updatedFile) return res.status(404).json({ message: "ፋይሉ አልተገኘም" });
    res.status(200).json({ success: true, data: updatedFile });
  } catch (error) {
    res.status(500).json({ message: "ማዘመን አልተቻለም" });
  }
};
export const getallFiles = async (req, res) => {
  try {
    // 🛑 እዚህ ጋር FileModel መሆኑን አረጋግጥ
    const files = await FileModel.find()
      .select("applicantName ownerName houseNo status service trackingId createdAt zone queue adminComment")
      .sort({ createdAt: -1 });

    res.status(200).json({ 
      success: true, 
      data: files 
    });
  } catch (error) {
    console.error("Get All Files Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};