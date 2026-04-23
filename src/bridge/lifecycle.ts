import { bridgeBaseUrl, type BridgeLifecycleMode } from "../config.js";
import { describeDomainPolicy, type DomainPolicy } from "../policy/domain-policy.js";
import { BridgeClient } from "./http-client.js";
import { startBridgeServer, type BridgeServerHandle } from "./http-server.js";
import type { BridgeStatus } from "./types.js";

export type BridgeRuntime = {
  source: "existing" | "managed";
  host: string;
  port: number;
  url: string;
  status: BridgeStatus;
  close?: () => Promise<void>;
};

type EnsureBridgeServerOptions = {
  host: string;
  port: number;
  mode?: BridgeLifecycleMode;
  domainPolicy?: DomainPolicy;
  healthTimeoutMs?: number;
};

async function readBridgeStatus(
  host: string,
  port: number,
  timeoutMs: number,
): Promise<BridgeStatus | null> {
  try {
    return await new BridgeClient(host, port).getStatus({ timeoutMs });
  } catch {
    return null;
  }
}

async function statusForStartedBridge(bridge: BridgeServerHandle, timeoutMs: number): Promise<BridgeStatus> {
  return new BridgeClient(bridge.host, bridge.port).getStatus({ timeoutMs });
}

export async function ensureBridgeServer(options: EnsureBridgeServerOptions): Promise<BridgeRuntime> {
  const mode = options.mode ?? "auto";
  const healthTimeoutMs = options.healthTimeoutMs ?? 500;
  const requiredPolicySummary = options.domainPolicy ? describeDomainPolicy(options.domainPolicy) : "";

  if (mode !== "managed" && options.port !== 0) {
    const status = await readBridgeStatus(options.host, options.port, healthTimeoutMs);
    if (status?.ok) {
      if (requiredPolicySummary && !status.notes.includes(requiredPolicySummary)) {
        throw new Error(
          `Bridge at ${bridgeBaseUrl(options.host, options.port)} does not report required domain policy: ${requiredPolicySummary}`,
        );
      }

      return {
        source: "existing",
        host: options.host,
        port: options.port,
        url: bridgeBaseUrl(options.host, options.port),
        status,
      };
    }

    if (mode === "external") {
      throw new Error(`Bridge is not available at ${bridgeBaseUrl(options.host, options.port)}`);
    }
  }

  if (mode === "external") {
    throw new Error(`Bridge is not available at ${bridgeBaseUrl(options.host, options.port)}`);
  }

  const bridge = await startBridgeServer(options.host, options.port, {
    domainPolicy: options.domainPolicy,
  });

  return {
    source: "managed",
    host: bridge.host,
    port: bridge.port,
    url: bridge.url,
    status: await statusForStartedBridge(bridge, healthTimeoutMs),
    close: bridge.close,
  };
}
