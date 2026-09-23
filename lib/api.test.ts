import assert from "node:assert/strict";
import test from "node:test";

import { apiGetProducts, apiRequest } from "@/lib/api";

type MockResponseInit = {
  status?: number;
  headers?: Record<string, string>;
  body?: unknown;
};

function createMockResponse({ status = 200, headers = { "content-type": "application/json" }, body }: MockResponseInit): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name: string) {
        const headerName = Object.keys(headers).find((key) => key.toLowerCase() === name.toLowerCase());
        return headerName ? headers[headerName] : null;
      },
    },
    async json() {
      return body;
    },
    async text() {
      return typeof body === "string" ? body : JSON.stringify(body);
    },
  } as Response;
}

test("apiRequest attaches csrf header for mutating requests when cookie exists", async () => {
  const originalDocument = globalThis.document;
  const originalFetch = globalThis.fetch;
  const fetchCalls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  Object.defineProperty(globalThis, "document", {
    value: { cookie: "csrf-token=known-csrf-token" },
    configurable: true,
  });

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    fetchCalls.push({ input, init });
    return createMockResponse({ body: { ok: true } });
  }) as typeof fetch;

  try {
    await apiRequest("/products/import", {
      method: "POST",
      body: { rows: [] },
    });

    assert.equal(fetchCalls.length, 1);
    const headers = new Headers(fetchCalls[0].init?.headers);
    assert.equal(headers.get("x-csrf-token"), "known-csrf-token");
  } finally {
    Object.defineProperty(globalThis, "document", {
      value: originalDocument,
      configurable: true,
    });
    globalThis.fetch = originalFetch;
  }
});

test("apiRequest bootstraps csrf cookie before mutating requests when cookie is initially missing", async () => {
  const originalDocument = globalThis.document;
  const originalFetch = globalThis.fetch;
  const fetchCalls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const documentState = { cookie: "" };

  Object.defineProperty(globalThis, "document", {
    value: documentState,
    configurable: true,
  });

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    fetchCalls.push({ input, init });
    const url = String(input);

    if (url.endsWith("/api/auth/session")) {
      documentState.cookie = "csrf-token=bootstrapped-token";
      return createMockResponse({ body: { user: { id: "1", name: "Admin", username: "admin", role: "admin" } } });
    }

    return createMockResponse({ body: { ok: true } });
  }) as typeof fetch;

  try {
    await apiRequest("/products/import", {
      method: "POST",
      body: { rows: [] },
    });

    assert.equal(fetchCalls.length, 2);
    assert.equal(String(fetchCalls[0].input), "/api/auth/session");
    assert.equal(fetchCalls[0].init?.method, "GET");

    const headers = new Headers(fetchCalls[1].init?.headers);
    assert.equal(headers.get("x-csrf-token"), "bootstrapped-token");
  } finally {
    Object.defineProperty(globalThis, "document", {
      value: originalDocument,
      configurable: true,
    });
    globalThis.fetch = originalFetch;
  }
});

test("apiGetProducts omits empty and null filters from the query string", async () => {
  const originalFetch = globalThis.fetch;
  const fetchCalls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    fetchCalls.push({ input, init });
    return createMockResponse({ body: { products: [] } });
  }) as typeof fetch;

  try {
    await apiGetProducts({ search: "", categoryId: null, status: null });

    assert.equal(fetchCalls.length, 1);
    assert.equal(String(fetchCalls[0].input), "/api/products");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
