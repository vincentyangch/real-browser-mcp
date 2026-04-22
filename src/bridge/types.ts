export type BrowserKind = "chrome";
export type ConnectorMode = "unconfigured" | "attached-session";
export type BridgeCommandKind = "open_url" | "scan_page" | "capture_screenshot";

export type BrowserTab = {
  id: string;
  url: string;
  title: string;
  active: boolean;
  lastSeenAt: string;
};

export type ConnectorSnapshot = {
  connector: string;
  browser: BrowserKind;
  mode: ConnectorMode;
  tabs: BrowserTab[];
  updatedAt: string;
};

export type BridgeStatus = {
  ok: boolean;
  bridgeVersion: string;
  browser: BrowserKind;
  mode: ConnectorMode;
  connected: boolean;
  connector: string | null;
  tabCount: number;
  updatedAt: string | null;
  notes: string[];
};

export type BridgeSnapshotResponse = {
  status: BridgeStatus;
  tabs: BrowserTab[];
};

export type BridgeCommandBase = {
  id: string;
  connector: string;
  status: "pending" | "dispatched" | "completed" | "failed";
  createdAt: string;
};

export type OpenUrlCommand = BridgeCommandBase & {
  kind: "open_url";
  payload: {
    url: string;
  };
};

export type ScanPageCommand = BridgeCommandBase & {
  kind: "scan_page";
  payload: {};
};

export type CaptureScreenshotCommand = BridgeCommandBase & {
  kind: "capture_screenshot";
  payload: {};
};

export type BridgeCommand = OpenUrlCommand | ScanPageCommand | CaptureScreenshotCommand;

export type BridgeCommandResult = {
  ok: boolean;
  result?: Record<string, unknown>;
  error?: string;
};
