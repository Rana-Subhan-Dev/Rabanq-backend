const { S3Client, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const AppError = require('../utils/AppError');

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Allowed file types for KYC documents
const allowedMimeTypes = [
  'image/jpeg', 'image/png', 'image/jpg',
  'application/pdf'
];

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type. Only JPEG, PNG, JPG and PDF are allowed.', 400), false);
  }
};

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
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Delete file from S3
const deleteFromS3 = async (key) => {
  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key
  });
  await s3Client.send(command);
};

// Get presigned URL for secure access
const getPresignedUrl = async (key, expiresIn = 3600) => {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key
  });
  return await getSignedUrl(s3Client, command, { expiresIn });
};

module.exports = { s3Client, upload, deleteFromS3, getPresignedUrl };
