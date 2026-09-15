import { Api, TelegramClient } from 'telegram';
import { CustomFile } from 'telegram/client/uploads.js';
import { extractFloodWait, sleep } from './flood-wait.js';
import { Readable } from 'stream';

export interface UploadResult {
  messageId: number;
  chatId: string;
  fileId: string;
}

export class Uploader {
  /**
   * Upload a file to Telegram Saved Messages.
   * Can accept a Readable stream, Buffer, or CustomFile.
   */
  public async uploadFile(
    client: TelegramClient,
    streamOrBuffer: Readable | Buffer,
    fileName: string,
    fileSize: number
  ): Promise<UploadResult> {
    let buffer: Buffer;

    if (Buffer.isBuffer(streamOrBuffer)) {
      buffer = streamOrBuffer;
    } else {
      // Read entire stream into buffer
      const chunks: Buffer[] = [];
      for await (const chunk of streamOrBuffer) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      buffer = Buffer.concat(chunks);
    }

    const customFile = new CustomFile(fileName, buffer.length, '', buffer);

    // Upload with FLOOD_WAIT retry logic
    let inputFile: any = null;
    const maxRetries = 5;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        inputFile = await client.uploadFile({
          file: customFile,
          workers: 3,
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
  }
}
