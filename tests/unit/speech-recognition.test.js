import assert from 'node:assert/strict';
import test from 'node:test';
import { SpeechRecognition } from '../../js/speechRecognition.js';

class FakeRecognitionEngine {
  start() {
    this.onstart();
  }

  stop() {
    this.onend();
  }
}

test('speech recognition reports deterministic transcripts and completion', () => {
  const transcripts = [];
  const statuses = [];
  const completed = [];
  globalThis.window = { SpeechRecognition: FakeRecognitionEngine };

  const recognition = new SpeechRecognition({
    onTranscript: (value) => transcripts.push(value),
    onStatus: (value) => statuses.push(value),
    onComplete: (value) => completed.push(value)
  });

  assert.equal(recognition.start('en-US'), true);
  recognition.recognition.onresult({
    results: [{ 0: { transcript: 'help' } }, { 0: { transcript: 'please' } }]
  });
  assert.equal(recognition.stop(), true);

  assert.deepEqual(transcripts, ['help please']);
  assert.equal(completed[0], 'help please');
  assert.match(statuses.at(-1), /PROCESSING/);
  delete globalThis.window;
});

test('unsupported speech recognition fails closed', () => {
  const statuses = [];
  globalThis.window = {};
  const recognition = new SpeechRecognition({
    onTranscript: () => {},
    onStatus: (value) => statuses.push(value),
    onComplete: () => {}
  });

  assert.equal(recognition.start('en-US'), false);
  assert.match(statuses[0], /not supported/i);
  delete globalThis.window;
});
