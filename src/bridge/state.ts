import { randomUUID } from "node:crypto";
import type {
  BrowserTab,
  BridgeCommand,
  BridgeCommandResult,
  BridgeSnapshotResponse,
  BridgeStatus,
  ConnectorSnapshot,
} from "./types.js";

const BRIDGE_VERSION = "0.1.0";

export class BridgeState {
  constructor(
    private readonly options: {
      statusNotes?: string[];
    } = {},
  ) {}

  private snapshot: ConnectorSnapshot | null = null;
  private readonly queuedCommands = new Map<string, BridgeCommand[]>();
  private readonly commandsById = new Map<string, BridgeCommand>();
  private readonly pendingWaiters = new Map<
    string,
    {
      resolve: (value: BridgeCommandResult) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  private readonly completedResults = new Map<string, BridgeCommandResult>();

  getStatus(): BridgeStatus {
    const tabs = this.snapshot?.tabs ?? [];
    const configuredNotes = this.options.statusNotes ?? [];
    const lifecycleNotes = this.snapshot
      ? []
      : [
          "Bridge server is running, but no browser connector has registered a session snapshot yet.",
          "Next step: implement a browser-side connector that posts tab snapshots to /v1/connector/snapshot.",
        ];

    return {
      ok: true,
      bridgeVersion: BRIDGE_VERSION,
      browser: this.snapshot?.browser ?? "chrome",
      mode: this.snapshot?.mode ?? "unconfigured",
      connected: this.snapshot !== null,
      connector: this.snapshot?.connector ?? null,
      tabCount: tabs.length,
      updatedAt: this.snapshot?.updatedAt ?? null,
      notes: [...configuredNotes, ...lifecycleNotes],
    };
  }

  getTabs(): BrowserTab[] {
    return this.snapshot?.tabs ?? [];
  }

  getSnapshotResponse(): BridgeSnapshotResponse {
    return {
      status: this.getStatus(),
      tabs: this.getTabs(),
    };
  }

  getPreferredTab(): BrowserTab | null {
    const tabs = this.getTabs();
    if (tabs.length === 0) return null;

    return tabs.find((tab) => tab.active) ?? tabs[0] ?? null;
  }

  findTabById(tabId: string): BrowserTab | null {
    return this.getTabs().find((tab) => tab.id === tabId) ?? null;
  }

  applySnapshot(snapshot: ConnectorSnapshot): BridgeSnapshotResponse {
    this.snapshot = {
      ...snapshot,
      tabs: snapshot.tabs.map((tab) => ({
        ...tab,
        lastSeenAt: tab.lastSeenAt || snapshot.updatedAt,
      })),
    };
    return this.getSnapshotResponse();
  }

  private enqueueCommand(command: BridgeCommand): BridgeCommand {
    const queue = this.queuedCommands.get(command.connector) ?? [];
    queue.push(command);
    this.queuedCommands.set(command.connector, queue);
    this.commandsById.set(command.id, command);
    return command;
  }

  enqueueOpenUrl(connector: string, url: string): BridgeCommand {
    return this.enqueueCommand({
      id: randomUUID(),
      connector,
      kind: "open_url",
      status: "pending",
      payload: { url },
      createdAt: new Date().toISOString(),
    });
  }

  enqueueSwitchTab(connector: string, tabId: string): BridgeCommand {
    return this.enqueueCommand({
      id: randomUUID(),
      connector,
      kind: "switch_tab",
      status: "pending",
      payload: { tabId },
      createdAt: new Date().toISOString(),
    });
  }

  enqueueClick(connector: string, text: string, exact: boolean): BridgeCommand {
    return this.enqueueCommand({
      id: randomUUID(),
      connector,
      kind: "click",
      status: "pending",
      payload: { text, exact },
      createdAt: new Date().toISOString(),
    });
  }

  enqueueScroll(connector: string, direction: "up" | "down", pages: number): BridgeCommand {
    return this.enqueueCommand({
      id: randomUUID(),
      connector,
      kind: "scroll",
      status: "pending",
      payload: { direction, pages },
      createdAt: new Date().toISOString(),
    });
  }

  enqueueType(connector: string, text: string, clear: boolean): BridgeCommand {
    return this.enqueueCommand({
      id: randomUUID(),
      connector,
      kind: "type",
      status: "pending",
      payload: { text, clear },
      createdAt: new Date().toISOString(),
    });
  }

  enqueueScanPage(connector: string): BridgeCommand {
    return this.enqueueCommand({
      id: randomUUID(),
      connector,
      kind: "scan_page",
      status: "pending",
      payload: {},
      createdAt: new Date().toISOString(),
    });
  }

  enqueueCaptureScreenshot(connector: string): BridgeCommand {
    return this.enqueueCommand({
      id: randomUUID(),
      connector,
      kind: "capture_screenshot",
      status: "pending",
      payload: {},
      createdAt: new Date().toISOString(),
    });
  }

  takeNextCommand(connector: string): BridgeCommand | null {
    const queue = this.queuedCommands.get(connector);
    if (!queue || queue.length === 0) return null;

    const command = queue.shift() ?? null;
    if (!command) return null;

    command.status = "dispatched";

    if (queue.length === 0) {
      this.queuedCommands.delete(connector);
    } else {
      this.queuedCommands.set(connector, queue);
    }

    return command;
  }

  completeCommand(commandId: string, result: BridgeCommandResult): void {
    const command = this.commandsById.get(commandId);
    if (command) {
      command.status = result.ok ? "completed" : "failed";
    }

    this.completedResults.set(commandId, result);

    const waiter = this.pendingWaiters.get(commandId);
    if (waiter) {
      clearTimeout(waiter.timer);
      this.pendingWaiters.delete(commandId);
      waiter.resolve(result);
    }
  }

  waitForCommandResult(commandId: string, timeoutMs: number): Promise<BridgeCommandResult> {
    const existing = this.completedResults.get(commandId);
    if (existing) return Promise.resolve(existing);

    return new Promise<BridgeCommandResult>((resolve) => {
      const timer = setTimeout(() => {
        this.pendingWaiters.delete(commandId);
        resolve({
          ok: false,
          error: `Timed out waiting for command result after ${timeoutMs}ms`,
        });
      }, timeoutMs);

      this.pendingWaiters.set(commandId, { resolve, timer });
    });
  }
}
