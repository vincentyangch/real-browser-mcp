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

  async switchTab(tabId: string, connector = "chrome-extension", timeoutMs = 5000): Promise<{
    command: BridgeCommand;
    result: BridgeCommandResult;
  }> {
    const res = await fetch(`${this.baseUrl}/v1/commands/switch-tab`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ connector, tabId, timeoutMs }),
    });

    return parseJson<{ command: BridgeCommand; result: BridgeCommandResult }>(res);
  }

  async click(
    text: string,
    exact = false,
    connector = "chrome-extension",
    timeoutMs = 5000,
  ): Promise<{
    command: BridgeCommand;
    result: BridgeCommandResult;
  }> {
    const res = await fetch(`${this.baseUrl}/v1/commands/click`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ connector, text, exact, timeoutMs }),
    });

    return parseJson<{ command: BridgeCommand; result: BridgeCommandResult }>(res);
  }

  async scroll(
    direction: "up" | "down",
    pages = 1,
    connector = "chrome-extension",
    timeoutMs = 5000,
  ): Promise<{
    command: BridgeCommand;
    result: BridgeCommandResult;
  }> {
    const res = await fetch(`${this.baseUrl}/v1/commands/scroll`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ connector, direction, pages, timeoutMs }),
    });

    return parseJson<{ command: BridgeCommand; result: BridgeCommandResult }>(res);
  }

  async type(
    text: string,
    clear = false,
    connector = "chrome-extension",
    timeoutMs = 5000,
  ): Promise<{
    command: BridgeCommand;
    result: BridgeCommandResult;
  }> {
    const res = await fetch(`${this.baseUrl}/v1/commands/type`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ connector, text, clear, timeoutMs }),
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

  async captureScreenshot(connector = "chrome-extension", timeoutMs = 5000): Promise<{
    command: BridgeCommand;
    result: BridgeCommandResult;
  }> {
    const res = await fetch(`${this.baseUrl}/v1/commands/capture-screenshot`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ connector, timeoutMs }),
    });

    return parseJson<{ command: BridgeCommand; result: BridgeCommandResult }>(res);
  }
}
