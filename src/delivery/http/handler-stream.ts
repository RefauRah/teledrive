import type { Request, Response, NextFunction } from 'express';
import type { StreamUsecase } from '../../usecase/stream.usecase.js';
import { getAuthUserId } from './middleware.js';

const MAX_UPLOAD_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

export class StreamHandler {
  private streamUsecase: StreamUsecase;

  constructor(streamUsecase: StreamUsecase) {
    this.streamUsecase = streamUsecase;
  }

  public handleUpload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getAuthUserId(req);

      let fileName = (req.headers['x-file-name'] as string) || (req.query.filename as string) || 'unnamed_file';
      try {
        fileName = decodeURIComponent(fileName);
      } catch {
        // use raw if decoding fails
      }

      const contentLengthStr =
        (req.headers['x-file-size'] as string) ||
        (req.headers['content-length'] as string) ||
        (req.query.file_size as string);

      if (!contentLengthStr) {
        res.status(400).json({ error: 'File size information (Content-Length or X-File-Size header) is required' });
        return;
      }

      const fileSize = parseInt(contentLengthStr, 10);
      if (isNaN(fileSize) || fileSize <= 0) {
        res.status(400).json({ error: 'file size must be greater than 0' });
        return;
      }

      if (fileSize > MAX_UPLOAD_SIZE) {
        res.status(400).json({
          error: `file size exceeds maximum allowed size of 2GB (${MAX_UPLOAD_SIZE} bytes)`,
        });
        return;
      }

      const folderIdParam = req.query.folder_id as string | undefined;
      const folderId = folderIdParam ? parseInt(folderIdParam, 10) : null;

      const file = await this.streamUsecase.upload(userId, folderId, fileName, fileSize, req);
      res.status(201).json(file);
    } catch (err: any) {
      console.error('Upload error:', err);
      res.status(500).json({ error: err.message || 'Failed to upload file' });
    }
  };

  public handleUploadChunk = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      const fileId = (req.headers['x-file-id'] as string) || (req.query.file_id as string);
      const partIndexStr = (req.headers['x-part-index'] as string) || (req.query.part_index as string);
      const totalPartsStr = (req.headers['x-total-parts'] as string) || (req.query.total_parts as string);
      const isBigStr = (req.headers['x-is-big'] as string) || (req.query.is_big as string);

      if (!fileId || partIndexStr === undefined || totalPartsStr === undefined) {
        res.status(400).json({ error: 'x-file-id, x-part-index, and x-total-parts headers are required' });
        return;
      }

      const partIndex = parseInt(partIndexStr, 10);
      const totalParts = parseInt(totalPartsStr, 10);
      const isBig = isBigStr === '1' || isBigStr === 'true';

      // Read chunk stream into buffer
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const chunkBuffer = Buffer.concat(chunks);

      if (chunkBuffer.length === 0) {
        res.status(400).json({ error: 'Chunk buffer cannot be empty' });
        return;
      }

      await this.streamUsecase.uploadChunk(userId, fileId, partIndex, totalParts, chunkBuffer, isBig);
      res.status(200).json({ ok: true, partIndex });
    } catch (err: any) {
      console.error('Chunk upload error:', err);
      res.status(500).json({ error: err.message || 'Failed to upload chunk' });
    }
  };

  public handleUploadComplete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      const { fileId, totalParts, fileName, fileSize, folderId, isBig } = req.body;

      if (!fileId || !totalParts || !fileName || !fileSize) {
        res.status(400).json({ error: 'fileId, totalParts, fileName, and fileSize are required' });
        return;
      }

      const file = await this.streamUsecase.completeChunkUpload(
        userId,
        folderId ? parseInt(folderId, 10) : null,
        String(fileId),
        parseInt(totalParts, 10),
        String(fileName),
        parseInt(fileSize, 10),
        Boolean(isBig)
      );

      res.status(201).json(file);
    } catch (err: any) {
      console.error('Upload complete error:', err);
      res.status(500).json({ error: err.message || 'Failed to finalize chunked upload' });
    }
  };

  public handleDownload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      const fileId = parseInt(req.params.id, 10);

      if (isNaN(fileId)) {
        res.status(400).json({ error: 'invalid file id' });
        return;
      }

      const file = await this.streamUsecase.getFileMetadata(userId, fileId);

      res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
      if (file.size > 0) {
        res.setHeader('Content-Length', file.size.toString());
      }

      await this.streamUsecase.download(userId, fileId, res);
      res.end();
    } catch (err: any) {
      console.error('Download error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message || 'Failed to download file' });
      }
    }
  };
}
