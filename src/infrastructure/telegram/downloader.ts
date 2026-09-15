import { TelegramClient } from 'telegram';
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
    if (!msg.media || !msg.media.document) {
      throw new Error(`Message ${messageId} does not contain a valid document`);
    }

    // Stream download chunks
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const downloadIter = client.iterDownload({
          file: msg.media.document,
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
