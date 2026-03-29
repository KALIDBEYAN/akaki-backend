import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';


dotenv.config();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folderName = 'complaints/files';
    let resourceType = 'auto'; // ቪዲዮ፣ ኦዲዮ እና ፎቶን በራሱ ይለያል
    

    if (file.mimetype.startsWith('video/')) {
        resourceType = 'video';
    } else if (file.mimetype.startsWith('audio/')) {
        resourceType = 'video'; // Cloudinary ኦዲዮን እንደ ቪዲዮ ሪሶርስ ነው የሚያየው
    }

    return {
      folder: folderName,
      resource_type: resourceType,
      public_id: Date.now() + '-' + file.originalname.split('.')[0],
    };
  },
});

export { cloudinary, storage };