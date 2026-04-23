import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

test("Chrome extension alarm republishes snapshots so late-started bridges discover the session", () => {
  const source = readFileSync(
    join(process.cwd(), "src", "connectors", "chrome-extension", "background.ts"),
    "utf8",
  );
  const alarmHandler = source.match(/chrome\.alarms\.onAlarm\.addListener\(\(alarm\) => \{[\s\S]*?\n\}\);/);

  assert.ok(alarmHandler, "alarm handler should be registered");
  assert.match(alarmHandler[0], /scheduleCommandPoll\(\)/);
  assert.match(alarmHandler[0], /scheduleSnapshot\(\)/);
});
