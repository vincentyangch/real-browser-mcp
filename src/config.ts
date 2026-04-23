import {
  normalizeDomainRules,
  type DomainPolicy,
} from "./policy/domain-policy.js";

export const DEFAULT_BRIDGE_HOST = process.env.REAL_BROWSER_MCP_BRIDGE_HOST ?? "127.0.0.1";
export const DEFAULT_BRIDGE_PORT = Number.parseInt(
  process.env.REAL_BROWSER_MCP_BRIDGE_PORT ?? "18767",
  10,
);

export type BridgeLifecycleMode = "auto" | "external" | "managed";

export function parseBridgeLifecycleMode(value: string | undefined): BridgeLifecycleMode {
  if (value === "external" || value === "managed") return value;
  return "auto";
}

export const DEFAULT_BRIDGE_LIFECYCLE_MODE = parseBridgeLifecycleMode(
  process.env.REAL_BROWSER_MCP_BRIDGE_MODE,
);

function parseDomainList(value: string | undefined): string[] {
  if (!value) return [];
  return normalizeDomainRules(value.split(","));
}

export const DEFAULT_DOMAIN_POLICY: DomainPolicy = {
  allowDomains: parseDomainList(process.env.REAL_BROWSER_MCP_ALLOWED_DOMAINS),
  denyDomains: parseDomainList(process.env.REAL_BROWSER_MCP_DENIED_DOMAINS),
};

export function bridgeBaseUrl(host = DEFAULT_BRIDGE_HOST, port = DEFAULT_BRIDGE_PORT): string {
  return `http://${host}:${port}`;
}
