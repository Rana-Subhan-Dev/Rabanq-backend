/**
 * @file upload.controller.js
 * @description Handles file uploads and deletions via AWS S3.
 *              Primarily used for KYC document uploads (front/back ID, selfie).
 *              Returns the S3 URL which is then saved in the KYC record.
 *              Uses pre-signed URLs for secure, direct browser-to-S3 uploads.
 * @routes
 *   POST   /api/upload           → Upload a file to S3
 *   DELETE /api/upload           → Delete a file from S3 by URL
 */

// import { uploadFileToS3, deleteFileFromS3 } from '../utils/s3.util.js';
import { deleteFromS3, upload } from '../config/s3.js';
import ActivityLog from '../models/ActivityLog.model.js';
//import logger from '../utils/logger.util.js';

// ─────────────────────────────────────────────
// @desc    Upload a file to AWS S3
// @access  Private
// ─────────────────────────────────────────────
export const uploadFile = async (req, res, next) => {
  try {
    // File is attached to req.file by multer middleware (configured in upload route)
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided. Please attach a file to upload.',
      });
    }

    const { folder = 'general' } = req.body;

    // Upload to S3 — returns the public URL of the uploaded file
    const fileUrl = await upload({
      file: req.file,
      folder: `rabanq/${folder}`,
      userId: req.user._id.toString(),
    });

    await ActivityLog.create({
      user: req.user._id,
      action: 'FILE_UPLOADED',
      description: `File uploaded to S3: ${fileUrl}`,
      ipAddress: req.ip,
    });

    logger.info(`File uploaded to S3 by user ${req.user._id}: ${fileUrl}`);

    return res.status(201).json({
      success: true,
      message: 'File uploaded successfully.',
      data: { url: fileUrl },
    });
  } catch (error) {
    logger.error(`uploadFile error: ${error.message}`);
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Delete a file from AWS S3 by its URL
// @access  Private
// ─────────────────────────────────────────────
export const deleteFile = async (req, res, next) => {
  try {
    const { fileUrl } = req.body;

    if (!fileUrl) {
      return res.status(400).json({
        success: false,
        message: 'fileUrl is required.',
      });
    }

    await deleteFromS3(fileUrl);

    await ActivityLog.create({
      user: req.user._id,
      action: 'FILE_DELETED',
      description: `File deleted from S3: ${fileUrl}`,
      ipAddress: req.ip,
    });

    logger.info(`File deleted from S3 by user ${req.user._id}: ${fileUrl}`);

    return res.status(200).json({
      success: true,
      message: 'File deleted successfully.',
    });
  } catch (error) {
    logger.error(`deleteFile error: ${error.message}`);
    next(error);
  }
};
