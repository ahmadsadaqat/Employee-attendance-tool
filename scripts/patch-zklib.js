#!/usr/bin/env node
/**
 * Patch node-zklib to decode inOutStatus from ZKTeco attendance records.
 *
 * Based on: https://github.com/caobo171/node-zklib/pull/60
 *
 * Changes:
 * 1. utils.js: decodeRecordData40 → read byte 31 for inOutStatus (0=IN, 1=OUT)
 * 2. utils.js: decodeRecordRealTimeLog52 → read byte 25 for inOutStatus
 * 3. zklibtcp.js: auto-detect record packet size (40 for TFT/B&W, 49 for iFace)
 *
 * Run: node scripts/patch-zklib.js
 * Or add to package.json: "postinstall": "node scripts/patch-zklib.js"
 */

const fs = require('fs');
const path = require('path');

const ZKLIB_DIR = path.join(__dirname, '..', 'node_modules', 'node-zklib');

function patchFile(filePath, patches) {
  if (!fs.existsSync(filePath)) {
    console.warn(`[patch-zklib] File not found: ${filePath}, skipping`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let patched = false;

  for (const { find, replace, name } of patches) {
    if (content.includes(replace)) {
      console.log(`[patch-zklib] Already patched: ${name}`);
      continue;
    }
    if (!content.includes(find)) {
      console.warn(`[patch-zklib] Could not find target for: ${name}`);
      continue;
    }
    content = content.replace(find, replace);
    patched = true;
    console.log(`[patch-zklib] Applied: ${name}`);
  }

  if (patched) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
  return patched;
}

// 1. Patch utils.js
patchFile(path.join(ZKLIB_DIR, 'utils.js'), [
  {
    name: 'decodeRecordData40: add inOutStatus',
    find: `        recordTime: parseTimeToDate(recordData.readUInt32LE(27)),\r\n      }\r\n      return record`,
    replace: `        recordTime: parseTimeToDate(recordData.readUInt32LE(27)),\r\n        inOutStatus: recordData[31] === 0 ? 0 : 1\r\n      }\r\n      return record`,
  },
  {
    // Fallback for LF line endings
    name: 'decodeRecordData40: add inOutStatus (LF)',
    find: `        recordTime: parseTimeToDate(recordData.readUInt32LE(27)),\n      }\n      return record`,
    replace: `        recordTime: parseTimeToDate(recordData.readUInt32LE(27)),\n        inOutStatus: recordData[31] === 0 ? 0 : 1\n      }\n      return record`,
  },
  {
    name: 'decodeRecordRealTimeLog52: add inOutStatus',
    find: `  return { userId, attTime}`,
    replace: `  // Determine In/Out status from Byte 25\n  const inOutStatus = recvData[25] === 0 ? 0 : 1\n\n  return { userId, attTime, inOutStatus}`,
  },
]);

// 2. Patch zklibtcp.js
patchFile(path.join(ZKLIB_DIR, 'zklibtcp.js'), [
  {
    name: 'getAttendances: auto-detect RECORD_PACKET_SIZE',
    find: `    const RECORD_PACKET_SIZE = 40\r\n`,
    replace: `    //Notes on record packet size:\r\n    //40 for tft and b&w devices (default)\r\n    //49 for iface devices\r\n    const RECORD_PACKET_SIZE = recordData.length % 40 !== 0 ? 49 : 40;\r\n\r\n    // Ensure the data size aligns with RECORD_PACKET_SIZE\r\n    if (recordData.length % RECORD_PACKET_SIZE !== 0) {\r\n        console.warn("Warning: Attendance data may be incomplete or corrupt");\r\n    }\r\n`,
  },
  {
    // Fallback for LF line endings
    name: 'getAttendances: auto-detect RECORD_PACKET_SIZE (LF)',
    find: `    const RECORD_PACKET_SIZE = 40\n`,
    replace: `    //Notes on record packet size:\n    //40 for tft and b&w devices (default)\n    //49 for iface devices\n    const RECORD_PACKET_SIZE = recordData.length % 40 !== 0 ? 49 : 40;\n\n    // Ensure the data size aligns with RECORD_PACKET_SIZE\n    if (recordData.length % RECORD_PACKET_SIZE !== 0) {\n        console.warn("Warning: Attendance data may be incomplete or corrupt");\n    }\n`,
  },
]);

console.log('[patch-zklib] Done.');
