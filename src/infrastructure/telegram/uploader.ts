import { Api, TelegramClient } from 'telegram';
import { CustomFile } from 'telegram/client/uploads.js';
import { extractFloodWait, sleep } from './flood-wait.js';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

export interface UploadResult {
  messageId: number;
  chatId: string;
  fileId: string;
}

export class Uploader {
  /**
   * Upload a file to Telegram Saved Messages.
   * Streams large files directly to a temporary file to avoid high memory consumption
   * and enable GramJS CustomBuffer chunked reading for files up to 2GB.
   */
  public async uploadFile(
    client: TelegramClient,
    streamOrBuffer: Readable | Buffer,
    fileName: string,
    fileSize: number
  ): Promise<UploadResult> {
    const tempDir = os.tmpdir();
    const randomSuffix = crypto.randomBytes(8).toString('hex');
    const safeBaseName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const tempFilePath = path.join(tempDir, `teledrive_${Date.now()}_${randomSuffix}_${safeBaseName}`);

    try {
      if (Buffer.isBuffer(streamOrBuffer)) {
        await fs.promises.writeFile(tempFilePath, streamOrBuffer);
      } else {
        const writeStream = fs.createWriteStream(tempFilePath);
        await pipeline(streamOrBuffer, writeStream);
      }

      const stat = await fs.promises.stat(tempFilePath);
      const actualSize = stat.size > 0 ? stat.size : fileSize;

      // Pass tempFilePath to CustomFile so GramJS can stream chunks directly from disk
      const customFile = new CustomFile(fileName, actualSize, tempFilePath);

      // Upload with FLOOD_WAIT retry logic
      let inputFile: any = null;
      const maxRetries = 5;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          inputFile = await client.uploadFile({
            file: customFile,
            workers: 4,
          });
          break;
        } catch (err: any) {
          const waitTime = extractFloodWait(err);
          if (waitTime > 0) {
            console.warn(`FLOOD_WAIT: sleeping ${waitTime}s before retry upload attempt ${attempt + 1}`);
            await sleep(waitTime * 1000 + attempt * 1000);
            continue;
          }
          throw err;
        }
      }

      if (!inputFile) {
        throw new Error('Failed to upload file to Telegram after retries');
      }

      // Send file to Saved Messages ("me")
      let sentMsg: any = null;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          sentMsg = await client.sendFile('me', {
            file: inputFile,
            forceDocument: true,
            attributes: [
              new Api.DocumentAttributeFilename({
                fileName,
              }),
            ],
          });
          break;
        } catch (err: any) {
          const waitTime = extractFloodWait(err);
          if (waitTime > 0) {
            console.warn(`FLOOD_WAIT: sleeping ${waitTime}s before retry sendFile attempt ${attempt + 1}`);
            await sleep(waitTime * 1000 + attempt * 1000);
            continue;
          }
          throw err;
        }
      }

      if (!sentMsg) {
        throw new Error('Failed to send uploaded media to Saved Messages');
      }

      const messageId = sentMsg.id;
      let chatId = '0';
      if (sentMsg.peerId) {
        chatId = (sentMsg.peerId.userId || sentMsg.peerId.chatId || sentMsg.peerId.channelId || 0).toString();
      }

      let fileId = '';
      if (sentMsg.media && sentMsg.media.document) {
        fileId = sentMsg.media.document.id.toString();
      } else {
        fileId = inputFile.id ? inputFile.id.toString() : messageId.toString();
      }

      return {
        messageId,
        chatId,
        fileId,
      };
    } finally {
      // Clean up temporary file
      await fs.promises.unlink(tempFilePath).catch(() => {});
    }
  }
}
