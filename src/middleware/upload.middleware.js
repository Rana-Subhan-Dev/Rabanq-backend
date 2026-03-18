/**
 * @file upload.middleware.js
 * @description Multer configuration for handling file uploads.
 *              Files are stored in memory (as Buffer) before being
 *              streamed to AWS S3 — no local disk storage used.
 *              Restricts file types to images and PDFs only.
 *              Max file size: 10MB.
 */

import multer from 'multer';

// Use memory storage — files go straight to buffer, then to S3
const storage = multer.memoryStorage();

// File type whitelist — only images and PDFs for KYC documents
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and PDF files are allowed.'), false);
  }
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max per file
  },
});
