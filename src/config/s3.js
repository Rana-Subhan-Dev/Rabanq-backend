import { S3Client, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import AppError from '../utils/AppError.js';

dotenv.config();

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Allowed file types
const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type. Only JPEG, PNG, JPG and PDF are allowed.', 400), false);
  }
};

// Multer-S3 upload
const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.AWS_S3_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname, uploadedBy: req.user?._id?.toString() || 'unknown' });
    },
    key: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const folder = `kyc-documents/${req.user?._id || 'unknown'}`;
      const filename = `${uuidv4()}${ext}`;
      cb(null, `${folder}/${filename}`);
    }
  }),
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Delete file from S3
const deleteFromS3 = async (key) => {
  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key
  });
  await s3Client.send(command);
};

// Get presigned URL
const getPresignedUrl = async (key, expiresIn = 3600) => {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key
  });
  return await getSignedUrl(s3Client, command, { expiresIn });
};

// ✅ Export using ESM
export { s3Client, upload, deleteFromS3, getPresignedUrl };