import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

test('firestore.rules enforces deny-by-default, verified-email ownership, and zero permissive wildcards', () => {
  const rules = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');

  assert.match(rules, /match \/{document=\*\*}\s*\{\s*allow read, write: if false;\s*\}/);
  assert.equal(/allow\s+(read|write)\s*:\s*if\s+true\s*;/.test(rules), false);
  assert.match(rules, /request\.auth\.token\.email_verified == true/);
  assert.match(rules, /function isValidId\(id\)/);
  assert.match(rules, /affectedKeys\(\)\.hasOnly/);
  assert.match(rules, /request\.time/);
});

test('every Firestore collection in firebase-blueprint.json has explicit rules coverage', () => {
  const blueprint = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'firebase-blueprint.json'), 'utf8')
  ) as { firestore: Record<string, unknown> };
  const rules = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');

  const paths = Object.keys(blueprint.firestore);
  assert.deepEqual(paths, [
    '/users/{userId}',
    '/users/{userId}/plans/{planId}',
    '/users/{userId}/interactions/{interactionId}',
    '/users/{userId}/impactLogs/{logId}',
  ]);

  assert.match(rules, /match \/users\/\{userId\}/);
  assert.match(rules, /match \/plans\/\{planId\}/);
  assert.match(rules, /match \/interactions\/\{interactionId\}/);
  assert.match(rules, /match \/impactLogs\/\{logId\}/);
});

test('security_spec.md documents owner isolation and adversarial payloads matching rules', () => {
  const spec = fs.readFileSync(path.join(ROOT, 'security_spec.md'), 'utf8');
  assert.ok(spec.includes('Owner-Only Household Isolation'));
  assert.ok(spec.includes('Dirty Dozen'));
  assert.ok(spec.includes('PERMISSION_DENIED'));
});
