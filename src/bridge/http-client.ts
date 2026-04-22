import { bridgeBaseUrl } from "../config.js";
import type { BridgeCommand, BridgeCommandResult, BridgeSnapshotResponse, BridgeStatus } from "./types.js";

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export class BridgeClient {
  constructor(
    private readonly host: string,
    private readonly port: number,
  ) {}

  private get baseUrl(): string {
    return bridgeBaseUrl(this.host, this.port);
  }

  async getStatus(): Promise<BridgeStatus> {
    const res = await fetch(`${this.baseUrl}/health`);
    return parseJson<BridgeStatus>(res);
  }

  async getTabs(): Promise<BridgeSnapshotResponse> {
    const res = await fetch(`${this.baseUrl}/v1/tabs`);
    return parseJson<BridgeSnapshotResponse>(res);
  }

  async openUrl(url: string, connector = "chrome-extension", timeoutMs = 5000): Promise<{
    command: BridgeCommand;
    result: BridgeCommandResult;
  }> {
    const res = await fetch(`${this.baseUrl}/v1/commands/open-url`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ connector, url, timeoutMs }),
    });

    return parseJson<{ command: BridgeCommand; result: BridgeCommandResult }>(res);
  }

  async scanPage(connector = "chrome-extension", timeoutMs = 5000): Promise<{
    command: BridgeCommand;
    result: BridgeCommandResult;
  }> {
    const res = await fetch(`${this.baseUrl}/v1/commands/scan-page`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ connector, timeoutMs }),
    });

    return parseJson<{ command: BridgeCommand; result: BridgeCommandResult }>(res);
  }
}
