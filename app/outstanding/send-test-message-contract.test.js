const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const hooksSource = fs.readFileSync(path.join(process.cwd(), "hooks", "use-outstanding.ts"), "utf8");
const apiSource = fs.readFileSync(path.join(process.cwd(), "lib", "api.ts"), "utf8");

assert(
  apiSource.includes('apiSendOutstandingTestMessage(salesPersonId: string): Promise<{ sent: number }>'),
  "Expected apiSendOutstandingTestMessage to match the backend's { sent: number } response shape"
);

assert(
  hooksSource.includes('function getTestMessageSuccessText(result: { sent?: number } | null | undefined)'),
  "Expected send-test hook to derive toast text from a guarded { sent } shape"
);

assert(
  hooksSource.includes('const sent = Number(result?.sent ?? 0);'),
  "Expected send-test success logic to guard nested access and handle missing sent counts"
);

assert(
  hooksSource.includes('Manual test limit reached') && hooksSource.includes('5 test messages per salesperson per hour'),
  "Expected send-test error logic to convert the backend rate-limit error into a friendly message"
);

assert(
  hooksSource.includes('notifications are disabled') && hooksSource.includes('phone is missing'),
  "Expected send-test error logic to surface skipped-style backend messages clearly"
);

assert(
  !hooksSource.includes('result.notification.status'),
  "Expected send-test hook not to assume a nested notification.status field"
);

console.log("Verified send-test message response contract and guarded toast logic");
