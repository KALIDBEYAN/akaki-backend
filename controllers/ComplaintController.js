import Complaint from "../models/Complaint.js";

/**
 * የኢትዮጵያ ስልክ ቁጥርን ለማረጋገጥ የሚረዳ Helper Function
 * በ +2519, +2517, 09, ወይም 07 ይጀምራል
 */
const validateEthiopianPhone = (phone) => {
  const phoneRegex = /^(\+2519|\+2517|09|07)[0-9]{8}$/;
  return phoneRegex.test(phone);
};

/*
====================================
 1. አዲስ ቅሬታ መቀበያ (Submit Complaint)
====================================
*/
export const submitComplaint = async (req, res) => {
  try {
    const { 
      fullName, phone, subject, description, 
      complaintType, city, subCity, woreda 
    } = req.body;

    // ሀ. የስም ቼክ (ቢያንስ ሁለት ስም - ስም እና አባት ስም - መኖሩን ማረጋገጥ)
    const nameParts = (fullName || "").trim().split(/\s+/);
    if (nameParts.length < 2) {
      return res.status(400).json({ 
        success: false, 
        message: "እባክዎ ሙሉ ስምዎን (ስም እና የአባት ስም) ያስገቡ" 
      });
    }

    // ለ. የስልክ ቁጥር ቫሊዴሽን (Ethiopian Standard)
    if (!validateEthiopianPhone(phone)) {
      return res.status(400).json({ 
        success: false, 
        message: "እባክዎ ትክክለኛ የኢትዮጵያ ስልክ ቁጥር ያስገቡ (ምሳሌ፡ 0911... ወይም 0711...)" 
      });
    }

    // ሐ. ፋይሎችን ለይቶ የማስቀመጫ ሎጂክ
    let uploadedFiles = [];
    let uploadedAudio = "";
    let uploadedVideo = "";
    let hasAudio = false;

    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        const mime = file.mimetype;
        const fileUrl = file.path;
        if (mime.startsWith('image/') || mime.includes('pdf')) {
          uploadedFiles.push(fileUrl);
        } else if (mime.startsWith('audio/') || mime.includes('webm')) {
          uploadedAudio = fileUrl;
          hasAudio = true; 
        } else if (mime.startsWith('video/')) {
          uploadedVideo = fileUrl;
        }
      });
    }

    // መ. የዝርዝር መግለጫ እና ርዕስ ቼክ (ድምፅ ካልተቀዳ ጽሁፉ ግዴታ ነው)
    if (!hasAudio) {
      if (!subject || subject.trim() === "" || !description || description.trim() === "") {
        return res.status(400).json({ 
          success: false, 
          message: "እባክዎ የቅሬታውን ዝርዝር እና ርዕስ ይጻፉ ወይም በድምፅ ይቅዱ" 
        });
      }
    }

    // ሠ. complaintType ወደ Array መለወጥ (ከፍሮንትኢንድ በ String ስለሚመጣ)
    let types = [];
    if (complaintType) {
      try {
        types = typeof complaintType === 'string' ? JSON.parse(complaintType) : complaintType;
      } catch (e) {
        types = [complaintType];
      }
    }

    // ረ. ዳታቤዝ ላይ ማስቀመጥ
    const complaint = await Complaint.create({
      fullName,
      phone,
      city,
      subCity,
      woreda,
      subject: subject || "በድምፅ የቀረበ ቅሬታ", 
      description: description || "ዝርዝሩ በድምፅ ፋይሉ ላይ ይገኛል",
      complaintType: types,
      files: uploadedFiles,
      audio: uploadedAudio,
      video: uploadedVideo,
      status: "pending"
    });

    res.status(201).json({
      success: true,
      message: "ቅሬታዎ በትክክል ደርሷል!",
      trackingId: complaint.trackingId,
      complaintId: complaint._id
    });

  } catch (err) {
    console.error("Submit Error:", err);
    res.status(500).json({ success: false, message: "የሰርቨር ስህተት አጋጥሟል" });
  }
};

/*
====================================
 2. ሁሉንም ቅሬታዎች ማምጫ (Manager Panel)
====================================
*/
export const getAllComplaints = async (req, res) => {
  try {
    // አዲሶቹ ቅሬታዎች ላይ እንዲመጡ በጊዜ ቅደም ተከተል ተደርድረዋል
    const complaints = await Complaint.find().sort({ createdAt: -1 });
    res.status(200).json(complaints);
  } catch (err) {
    console.error("Get All Error:", err);
    res.status(500).json({ success: false, message: "መረጃዎችን ማምጣት አልተቻለም" });
  }
};

/*
====================================
 3. የሁኔታ እና የማስታወሻ ማዘመኛ
====================================
*/
export const updateComplaintStatus = async (req, res) => {
  try {
    const { status, managerNote } = req.body;
    const allowedStatus = ["pending", "in-progress", "resolved", "rejected"];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ success: false, message: "የማይፈቀድ የሁኔታ አይነት" });
    }

    const updated = await Complaint.findByIdAndUpdate(
      req.params.id,
      { status, managerNote: managerNote || "" },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "ቅሬታው አልተገኘም" });
    }

    res.json({ success: true, message: "ሁኔታው ተዘምኗል", data: updated });
  } catch (err) {
    console.error("Update Status Error:", err);
    res.status(500).json({ success: false, message: "ማሻሻል አልተቻለም" });
  }
};

/*
====================================
 4. ቅሬታን መሰረዣ
====================================
*/
export const deleteComplaint = async (req, res) => {
  try {
    const deleted = await Complaint.findByIdAndDelete(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({ success: false, message: "ቅሬታው አልተገኘም" });
    }

    res.status(200).json({ success: true, message: "ቅሬታው ተሰርዟል" });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({ success: false, message: "መሰረዝ አልተቻለም" });
  }
};
