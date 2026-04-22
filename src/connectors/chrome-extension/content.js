if (window.top === window) {
  const pollBridge = async () => {
    if (document.visibilityState !== "visible") return;

    try {
      await chrome.runtime.sendMessage({ type: "poll-bridge" });
    } catch (err) {
      console.warn("[real-browser-mcp][chrome-extension] content poll failed:", err);
    }
  };

  void pollBridge();
  window.setInterval(() => {
    void pollBridge();
  }, 1000);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void pollBridge();
    }
  });
}
