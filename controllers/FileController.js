import FileModel from "../models/File.js";
import BlockedUser from "../models/BlockedUser.js";
import mongoose from "mongoose";

// 🔹 ስምን ነጥሎ ለማውጣት (Normalization)
const normalizeName = (name) => {
  if (!name) return "";
  return name.trim().toLowerCase().split(/\s+/).slice(0, 2).join(" ");
};

// 🔹 አዲስ ፋይል መመዝገብ (አንድ ፋይል ከብዙ አገልግሎት ጋር)
export const createFile = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { applicantName, ownerName, houseNo, services } = req.body;

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

    // ለ. አገልግሎቶቹን ወደ Array of Objects መቀየር (ለአንድ ፋይል)
    const serviceList = Array.isArray(services) && services.length > 0 ? services : [req.body.service];
    
    const formattedServices = serviceList.map(sName => ({
      serviceName: sName,
      status: "pending",
      assignedTo: null,
      expertName: ""
    }));

    // ሐ. አንድ ፋይል ብቻ መፍጠር
    const newFile = new FileModel({ 
      ...req.body, 
      services: formattedServices, 
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


export const assignFile = async (req, res) => {
    try {
        const { expertName, fileCount, senderName, expertId } = req.body; // expertId ከሌለ በስም ብቻ ይሰራል
        const { id, serviceId } = req.params;

        const file = await FileModel.findOneAndUpdate(
            { _id: id, "services._id": serviceId },
            { 
                $set: { 
                    "services.$.status": "assigned", 
                    "services.$.assignedTo": expertId || null, // ID ካለ ይገባል
                    "services.$.expertName": expertName,
                    "services.$.assignedAt": new Date(),
                    senderName: senderName, 
                    fileCount: fileCount,
                    status: "assigned" // የፋይሉ አጠቃላይ ሁኔታ እንዲቀየር
                } 
            },
            { new: true }
        );

        if (!file) return res.status(404).json({ success: false, message: "ፋይሉ አልተገኘም" });

        return res.status(200).json({ success: true, message: "በስኬት ተመድቧል" });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 🔹 የፋይል ሁኔታን ለማዘመን (With Transaction)
export const updateFileStatus = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const file = await FileModel.findById(id).session(session);

    if (!file) throw new Error("ፋይሉ አልተገኘም");

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
      .populate("services.assignedTo", "fullName role"); 
    return res.json(files);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};



// 🔹 ባለሙያ ሲረከብ
export const expertReceive = async (req, res) => {
    try {
        const { id, serviceId } = req.params;
        const expertId = req.user.id; // ከ protect middleware የመጣ [cite: 62]
        const expertName = req.user.fullName;

        const file = await FileModel.findOneAndUpdate(
            { _id: id, "services._id": serviceId },
            { 
                $set: { 
                    "services.$.status": "received",
                    "services.$.assignedTo": expertId, // ባለሙያውን መመዝገብ
                    "services.$.expertName": expertName, // ስሙን መመዝገብ
                    "services.$.assignedAt": new Date()
                } 
            },
            { new: true }
        );

        if (!file) return res.status(404).json({ success: false, message: "ፋይሉ አልተገኘም" });

        await syncFileOverallStatus(id); // አጠቃላይ የፋይሉን ሁኔታ ማዘመን [cite: 32]
        return res.json({ success: true, message: "አገልግሎቱን ተረክበዋል" });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 🔹 ባለሙያ ሥራውን ሲያጠናቅቅ
export const expertReturn = async (req, res) => {
    try {
        const { id, serviceId } = req.params;
        await FileModel.findOneAndUpdate(
            { _id: id, "services._id": serviceId },
            { $set: { "services.$.status": "completed" } }
        );

        await syncFileOverallStatus(id);
        return res.json({ success: true, message: "አገልግሎቱ ተጠናቋል" });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 🔹 አገልግሎቱን ማረጋገጥ (Verify Specific Service)
export const verifyService = async (req, res) => {
    try {
        const { id, serviceId } = req.params; 
        const file = await FileModel.findOneAndUpdate(
            { _id: id, "services._id": serviceId },
            { $set: { "services.$.status": "verified" } },
            { new: true }
        );

        if (!file) return res.status(404).json({ success: false, message: "ፋይሉ አልተገኘም" });

        await syncFileOverallStatus(id);
        return res.json({ success: true, message: "አገልግሎቱ ተረጋግጧል" });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 🔹 አገልግሎቱን ውድቅ ማድረግ (Reject Specific Service) - አዲስ የተጨመረ
export const rejectService = async (req, res) => {
    try {
        const { id, serviceId } = req.params;
        const { adminComment } = req.body;

        const file = await FileModel.findOneAndUpdate(
            { _id: id, "services._id": serviceId },
            { 
                $set: { 
                    "services.$.status": "rejected",
                    "services.$.adminComment": adminComment // አሁን ሞዴሉ ላይ ስላለ ሴቭ ይሆናል
                } 
            },
            { new: true }
        );

        if (!file) return res.status(404).json({ success: false, message: "ፋይሉ አልተገኘም" });

        await syncFileOverallStatus(id);
        return res.json({ success: true, message: "አገልግሎቱ ተመልሷል" });
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


export const updateFileData = async (req, res) => {
  try {
    const { services, ...otherData } = req.body;
    let updatePayload = { ...otherData };

    // አገልግሎቶች (services) ካሉ ወደ ትክክለኛው የObject ፎርማት መቀየር
    if (services && Array.isArray(services)) {
      updatePayload.services = services.map(sName => ({
        serviceName: sName,
        status: "pending", // ሲስተካከል ወደ ኋላ ይመለሳል
        assignedTo: null,
        expertName: ""
      }));
      // ፋይሉ በጠቅላላ ወደ pending እንዲመለስ ካስፈለገ
      updatePayload.status = "pending"; 
    }

    const updatedFile = await FileModel.findByIdAndUpdate(
      req.params.id,
      { $set: updatePayload },
      { new: true, runValidators: true } // 'new: true' የተስተካከለውን እንዲመልስ ያደርጋል
    );

    if (!updatedFile) {
      return res.status(404).json({ success: false, message: "ፋይሉ አልተገኘም" });
    }

    res.status(200).json({ success: true, data: updatedFile });
  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({ success: false, message: "ማዘመን አልተቻለም", error: error.message });
  }
};

// 🔹 ሁሉንም ፋይሎች ለሪፖርት ወይም ለዝርዝር ማየት
export const getallFiles = async (req, res) => {
  try {
    const files = await FileModel.find()
      .select("applicantName ownerName houseNo status services trackingId createdAt zone queue adminComment fileCount senderName expertName")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: files });
  } catch (error) {
    console.error("Get All Files Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
// 🔹 የፋይሉን አጠቃላይ ሁኔታ ከአገልግሎቶቹ አንጻር የሚያዘምን ተግባር
// 🔹 የፋይሉን አጠቃላይ ሁኔታ ከአገልግሎቶቹ አንጻር የሚያዘምን ተግባር
const syncFileOverallStatus = async (fileId, session = null) => {
    const file = await FileModel.findById(fileId).session(session);
    if (!file) return;

    const allStatuses = file.services.map(s => s.status);

    let newOverallStatus = "pending";

    // አንዱም አገልግሎት "rejected" ከሆነ አጠቃላይ ፋይሉ "rejected" እንዲባል
    if (allStatuses.some(s => s === "rejected")) {
        newOverallStatus = "rejected";
    } else if (allStatuses.every(s => s === "verified")) {
        newOverallStatus = "verified";
    } else if (allStatuses.every(s => ["completed", "verified"].includes(s))) {
        newOverallStatus = "completed";
    } else if (allStatuses.every(s => ["received", "completed", "verified"].includes(s))) {
        newOverallStatus = "received";
    } else if (allStatuses.every(s => ["assigned", "received", "completed", "verified"].includes(s))) {
        newOverallStatus = "assigned";
    }

    file.status = newOverallStatus;
    await file.save({ session });
};
// 🔹 ፋይልን ውድቅ ማድረግ (Reject) ከምክንያት ጋር
export const rejectFile = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminComment } = req.body; // ከአድሚን የመጣው ምክንያት

    const updatedFile = await FileModel.findByIdAndUpdate(
      id,
      { 
        $set: { 
          status: "rejected", 
          adminComment: adminComment // እዚህ ጋር ዳታቤዝ ውስጥ ይገባል
        } 
      },
      { new: true }
    );

    if (!updatedFile) return res.status(404).json({ success: false, message: "ፋይሉ አልተገኘም" });

    res.json({ success: true, data: updatedFile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🔹 አንድን አገልግሎት ብቻ ለመሰረዝ
export const deleteService = async (req, res) => {
  try {
    const { id, serviceId } = req.params;

    if (!serviceId) {
      return res.status(400).json({ success: false, message: "የአገልግሎት መለያ (Service ID) ያስፈልጋል" });
    }

    const updatedFile = await FileModel.findByIdAndUpdate(
      id,
      { $pull: { services: { _id: serviceId } } },
      { new: true }
    );

    if (!updatedFile) {
      return res.status(404).json({ success: false, message: "ፋይሉ አልተገኘም" });
    }

    

    await syncFileOverallStatus(id);

    return res.json({ success: true, message: "አገልግሎቱ ተሰርዟል", data: updatedFile });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};