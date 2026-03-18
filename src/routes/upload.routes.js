/**
 * @file upload.routes.js
 * @description Routes for AWS S3 file upload and deletion.
 *              Uses multer middleware to handle multipart/form-data.
 *              Restricts file types and sizes at the route level.
 * @prefix /api/upload
 */

import { Router } from 'express';
import { uploadFile, deleteFile } from '../controllers/upload.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { uploadMiddleware } from '../middleware/upload.middleware.js';

const router = Router();

router.use(protect);

// POST /api/upload
// uploadMiddleware processes the multipart file before the controller runs
router.post('/', uploadMiddleware.single('file'), uploadFile);

// DELETE /api/upload
router.delete('/', deleteFile);

export default router;
