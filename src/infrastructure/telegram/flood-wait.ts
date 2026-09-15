export function extractFloodWait(err: any): number {
  if (!err) return 0;

  const msg = err.errorMessage || err.message || '';
  const match = String(msg).match(/FLOOD_WAIT_(\d+)/i);
  if (match) {
    const seconds = parseInt(match[1], 10);
    return isNaN(seconds) || seconds <= 0 ? 5 : seconds;
  }

  if (err.seconds && typeof err.seconds === 'number') {
    return err.seconds;
  }

  return 0;
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
