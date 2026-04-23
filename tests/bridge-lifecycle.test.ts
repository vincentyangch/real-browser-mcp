import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:net";

import { startBridgeServer } from "../src/bridge/http-server.js";
import { ensureBridgeServer } from "../src/bridge/lifecycle.js";
import { BridgeClient } from "../src/bridge/http-client.js";

async function getUnusedPort(): Promise<number> {
  const server = createServer();

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();
  assert.ok(address && typeof address === "object");
  const port = address.port;

  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });

  return port;
}

test("ensureBridgeServer starts a managed bridge when auto mode finds no healthy bridge", async () => {
  const runtime = await ensureBridgeServer({
    host: "127.0.0.1",
    port: 0,
    mode: "auto",
    domainPolicy: {
      allowDomains: ["linux.do"],
      denyDomains: ["discord.com"],
    },
  });

  try {
    assert.equal(runtime.source, "managed");

    const client = new BridgeClient(runtime.host, runtime.port);
    const status = await client.getStatus();

    assert.equal(status.ok, true);
    assert.match(
      status.notes.join("\n"),
      /Domain policy active\. allow=linux\.do; deny=discord\.com/,
    );
  } finally {
    await runtime.close?.();
  }
});

test("ensureBridgeServer reuses an existing healthy bridge in auto mode", async () => {
  const bridge = await startBridgeServer("127.0.0.1", 0);

  try {
    const runtime = await ensureBridgeServer({
      host: bridge.host,
      port: bridge.port,
      mode: "auto",
    });

    assert.equal(runtime.source, "existing");
    assert.equal(runtime.port, bridge.port);
    assert.equal(runtime.close, undefined);
  } finally {
    await bridge.close();
  }
});

test("ensureBridgeServer rejects an existing bridge that does not report the required domain policy", async () => {
  const bridge = await startBridgeServer("127.0.0.1", 0);

  try {
    await assert.rejects(
      ensureBridgeServer({
        host: bridge.host,
        port: bridge.port,
        mode: "auto",
        domainPolicy: {
          allowDomains: ["linux.do"],
          denyDomains: [],
        },
      }),
      /does not report required domain policy/,
    );
  } finally {
    await bridge.close();
  }
});

test("ensureBridgeServer fails clearly in external mode when the bridge is unavailable", async () => {
  const port = await getUnusedPort();

  await assert.rejects(
    ensureBridgeServer({
      host: "127.0.0.1",
      port,
      mode: "external",
    }),
    /Bridge is not available/,
  );
});
