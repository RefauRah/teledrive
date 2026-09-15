import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractFloodWait } from '../src/infrastructure/telegram/flood-wait.js';

describe('FLOOD_WAIT Parser', () => {
  it('should return 0 for non-flood errors', () => {
    assert.equal(extractFloodWait(null), 0);
    assert.equal(extractFloodWait(new Error('Network error')), 0);
    assert.equal(extractFloodWait({ errorMessage: 'PHONE_CODE_INVALID' }), 0);
  });

  it('should parse FLOOD_WAIT_X error strings', () => {
    assert.equal(extractFloodWait({ errorMessage: 'FLOOD_WAIT_42' }), 42);
    assert.equal(extractFloodWait(new Error('A wait of FLOOD_WAIT_120 is required')), 120);
  });

  it('should parse seconds property if present', () => {
    assert.equal(extractFloodWait({ seconds: 15 }), 15);
  });
});
