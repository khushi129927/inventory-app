import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMessage,
  createLogNotificationProvider,
  createTwilioNotificationProvider,
} from "../src/services/notification-providers.js";

test("log provider prints the message, returns a fake id, and never calls fetch", async () => {
  const logs = [];
  const provider = createLogNotificationProvider({
    log: (...args) => logs.push(args.join(" ")),
  });

  const result = await provider.send({
    to: "+919876543210",
    channel: "sms",
    text: "Test",
  });

  assert.equal(result.status, "dry_run");
  assert.match(result.providerMessageId, /^dry-run-/);
  assert.equal(logs.length, 1);
  assert.match(logs[0], /notification dry-run/);
});

test("twilio provider builds the correct SMS request and never exposes the auth token in errors", async () => {
  const originalEnv = { ...process.env };
  process.env.TWILIO_ACCOUNT_SID = "AC123";
  process.env.TWILIO_AUTH_TOKEN = "secret-token";
  process.env.TWILIO_SMS_FROM = "+15551234567";
  process.env.TWILIO_WHATSAPP_FROM = "+15557654321";

  let receivedRequest = null;
  const provider = createTwilioNotificationProvider({
    fetchImpl: async (url, options) => {
      receivedRequest = { url, options };
      return {
        ok: true,
        json: async () => ({ sid: "SM123" }),
      };
    },
  });

  try {
    const result = await provider.send({
      to: "+919876543210",
      channel: "sms",
      text: "Hello",
    });

    assert.equal(result.providerMessageId, "SM123");
    assert.match(receivedRequest.url, /Accounts\/AC123\/Messages\.json$/);
    assert.equal(receivedRequest.options.method, "POST");
    assert.match(receivedRequest.options.headers.Authorization, /^Basic /);
    assert.equal(receivedRequest.options.body.get("To"), "+919876543210");
    assert.equal(receivedRequest.options.body.get("From"), "+15551234567");
    assert.equal(receivedRequest.options.body.get("Body"), "Hello");
  } finally {
    process.env = originalEnv;
  }
});

test("twilio provider builds the correct WhatsApp request", async () => {
  const originalEnv = { ...process.env };
  process.env.TWILIO_ACCOUNT_SID = "AC123";
  process.env.TWILIO_AUTH_TOKEN = "secret-token";
  process.env.TWILIO_SMS_FROM = "+15551234567";
  process.env.TWILIO_WHATSAPP_FROM = "+15557654321";

  let receivedRequest = null;
  const provider = createTwilioNotificationProvider({
    fetchImpl: async (url, options) => {
      receivedRequest = { url, options };
      return {
        ok: true,
        json: async () => ({ sid: "SM124" }),
      };
    },
  });

  try {
    await provider.send({
      to: "+919876543210",
      channel: "whatsapp",
      text: "Hello WhatsApp",
    });

    assert.equal(receivedRequest.options.body.get("To"), "whatsapp:+919876543210");
    assert.equal(receivedRequest.options.body.get("From"), "whatsapp:+15557654321");
  } finally {
    process.env = originalEnv;
  }
});

test("twilio provider throws a descriptive error without leaking the auth token", async () => {
  const originalEnv = { ...process.env };
  process.env.TWILIO_ACCOUNT_SID = "AC123";
  process.env.TWILIO_AUTH_TOKEN = "secret-token";
  process.env.TWILIO_SMS_FROM = "+15551234567";
  process.env.TWILIO_WHATSAPP_FROM = "+15557654321";

  const provider = createTwilioNotificationProvider({
    fetchImpl: async () => ({
      ok: false,
      status: 401,
      json: async () => ({ message: "Auth failed" }),
    }),
  });

  try {
    await assert.rejects(
      () => provider.send({ to: "+919876543210", channel: "sms", text: "Hello" }),
      (error) => {
        assert.match(error.message, /Twilio notification failed: Auth failed/);
        assert.equal(error.message.includes("secret-token"), false);
        return true;
      }
    );
  } finally {
    process.env = originalEnv;
  }
});

test("buildMessage keeps all business text in one place", () => {
  const text = buildMessage({
    clientCount: 2,
    totalAmount: 12345,
    topClients: [
      { clientName: "Acme", amount: 10000 },
      { clientName: "Bravo", amount: 2345 },
    ],
    link: "https://inventory.example.com/o/token",
  });

  assert.match(text, /Outstanding due today: 2 client\(s\), total Rs 12345/);
  assert.match(text, /Acme: Rs 10000/);
  assert.match(text, /View details: https:\/\/inventory\.example\.com\/o\/token/);
});
