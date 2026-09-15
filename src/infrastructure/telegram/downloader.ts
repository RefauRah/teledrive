import { Api, TelegramClient } from 'telegram';
import { extractFloodWait, sleep } from './flood-wait.js';
import type { Writable } from 'stream';

export class Downloader {
  /**
   * Download a file from Telegram Saved Messages by message ID and stream chunks to writer.
   */
  public async downloadFile(
    client: TelegramClient,
    messageId: number,
    writer: Writable
  ): Promise<void> {
    const maxRetries = 5;
    let messages: any = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        messages = await client.getMessages('me', {
          ids: [messageId],
        });
        break;
      } catch (err: any) {
        const waitTime = extractFloodWait(err);
        if (waitTime > 0) {
          console.warn(`FLOOD_WAIT: sleeping ${waitTime}s before retry getMessages (attempt ${attempt + 1})`);
          await sleep(waitTime * 1000 + attempt * 1000);
          continue;
        }
        throw err;
      }
    }

    if (!messages || messages.length === 0 || !messages[0]) {
      throw new Error(`Message ${messageId} not found in Saved Messages`);
    }

    const msg = messages[0];
    if (!msg.media) {
      throw new Error(`Message ${messageId} does not contain valid media`);
    }

    let inputLocation: any = null;
    let dcId: number | undefined;
    let fileSize: any;

    if (msg.media.document) {
      const doc = msg.media.document;
      inputLocation = new Api.InputDocumentFileLocation({
        id: doc.id,
        accessHash: doc.accessHash,
        fileReference: doc.fileReference,
        thumbSize: '',
      });
      dcId = doc.dcId;
      fileSize = doc.size;
    } else if (msg.media.photo) {
      const photo = msg.media.photo;
      const photoSizes = [...(photo.sizes || []), ...(photo.videoSizes || [])];
      const largestSize = photoSizes[photoSizes.length - 1];
      inputLocation = new Api.InputPhotoFileLocation({
        id: photo.id,
        accessHash: photo.accessHash,
        fileReference: photo.fileReference,
        thumbSize: (largestSize && 'type' in largestSize) ? largestSize.type : '',
      });
      dcId = photo.dcId;
    } else {
      throw new Error(`Message ${messageId} contains unsupported media type`);
    }

    // Stream download chunks
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const downloadIter = client.iterDownload({
          file: inputLocation,
          dcId,
          fileSize,
          chunkSize: 512 * 1024,
          requestSize: 512 * 1024,
        });

        for await (const chunk of downloadIter) {
          if (!writer.write(chunk)) {
            // Respect backpressure
            await new Promise((resolve) => writer.once('drain', resolve));
          }
        }
        break;
      } catch (err: any) {
        const waitTime = extractFloodWait(err);
        if (waitTime > 0) {
          console.warn(`FLOOD_WAIT: sleeping ${waitTime}s before retry iterDownload (attempt ${attempt + 1})`);
          await sleep(waitTime * 1000 + attempt * 1000);
          continue;
        }
        throw err;
      }
    }
  }
}
