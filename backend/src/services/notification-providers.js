function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for Twilio notifications`);
  }
  return value;
}

export function buildMessage({ clientCount, totalAmount, topClients, link, isTest = false }) {
  if (clientCount === 0) {
    return isTest ? "Test message: no outstanding balances are currently due." : "No outstanding balances are due today.";
  }

  const clientSummary = topClients.length > 0
    ? topClients.map((client) => `${client.clientName}: Rs ${Math.round(client.amount)}`).join(", ")
    : "";

  return `Outstanding due today: ${clientCount} client(s), total Rs ${Math.round(totalAmount)}. ${clientSummary}. View details: ${link}`;
}

export function createLogNotificationProvider(logger = console) {
  return {
    mode: "log",
    async send({ to, channel, text }) {
      const providerMessageId = `dry-run-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      logger.log(`[notification dry-run] ${channel} -> ${to}: ${text}`);
      return { providerMessageId, status: "dry_run" };
    },
  };
}

export function createTwilioNotificationProvider(options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("Global fetch is required for Twilio notifications");
  }

  return {
    mode: "twilio",
    async send({ to, channel, text }) {
      const accountSid = requiredEnv("TWILIO_ACCOUNT_SID");
      const authToken = requiredEnv("TWILIO_AUTH_TOKEN");
      const smsFrom = process.env.TWILIO_SMS_FROM?.trim();
      const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM?.trim();

      const from = channel === "whatsapp"
        ? `whatsapp:${requiredEnv("TWILIO_WHATSAPP_FROM")}`
        : requiredEnv("TWILIO_SMS_FROM");
      const toValue = channel === "whatsapp" ? `whatsapp:${to}` : to;

      if (channel === "sms" && !smsFrom) {
        throw new Error("TWILIO_SMS_FROM is required for Twilio notifications");
      }
      if (channel === "whatsapp" && !whatsappFrom) {
        throw new Error("TWILIO_WHATSAPP_FROM is required for Twilio notifications");
      }

      const body = new URLSearchParams({
        To: toValue,
        From: from,
        Body: text,
      });

      const response = await fetchImpl(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body,
        }
      );

      const payload = await response.json().catch(async () => ({ message: await response.text() }));
      if (!response.ok) {
        const message = typeof payload?.message === "string" ? payload.message : `Twilio request failed with status ${response.status}`;
        throw new Error(`Twilio notification failed: ${message}`);
      }

      return {
        providerMessageId: payload.sid,
        status: "sent",
      };
    },
  };
}

export function createNotificationProvider(options = {}) {
  const providerName = (options.providerName ?? process.env.NOTIFY_PROVIDER ?? "log").trim().toLowerCase();

  switch (providerName) {
    case "twilio":
      return createTwilioNotificationProvider(options);
    case "log":
    default:
      return createLogNotificationProvider(options.logger);
  }
}
