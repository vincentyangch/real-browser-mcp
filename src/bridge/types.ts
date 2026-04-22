export type BrowserKind = "chrome";
export type ConnectorMode = "unconfigured" | "attached-session";
export type BridgeCommandKind =
  | "open_url"
  | "switch_tab"
  | "click"
  | "scroll"
  | "type"
  | "scan_page"
  | "capture_screenshot";

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

export type SwitchTabCommand = BridgeCommandBase & {
  kind: "switch_tab";
  payload: {
    tabId: string;
  };
};

export type ClickCommand = BridgeCommandBase & {
  kind: "click";
  payload: {
    text: string;
    exact: boolean;
  };
};

export type ScrollCommand = BridgeCommandBase & {
  kind: "scroll";
  payload: {
    direction: "up" | "down";
    pages: number;
  };
};

export type TypeCommand = BridgeCommandBase & {
  kind: "type";
  payload: {
    text: string;
    clear: boolean;
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

export type BridgeCommand =
  | OpenUrlCommand
  | SwitchTabCommand
  | ClickCommand
  | ScrollCommand
  | TypeCommand
  | ScanPageCommand
  | CaptureScreenshotCommand;

export type BridgeCommandResult = {
  ok: boolean;
  result?: Record<string, unknown>;
  error?: string;
};
