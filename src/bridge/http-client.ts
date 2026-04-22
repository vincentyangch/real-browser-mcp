import { bridgeBaseUrl } from "../config.js";
import type { BridgeSnapshotResponse, BridgeStatus } from "./types.js";

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
}
