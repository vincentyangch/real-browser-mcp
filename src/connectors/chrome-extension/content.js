if (window.top === window) {
  const NEXT_COMMAND_URL = "http://127.0.0.1:18767/v1/connector/next-command?connector=chrome-extension";
  const COMMAND_RESULT_URL = "http://127.0.0.1:18767/v1/connector/command-result";

  const pollBridge = async () => {
    if (document.visibilityState !== "visible") return;

    try {
      const response = await fetch(NEXT_COMMAND_URL);
      const body = await response.json();

      if (!body.command) return;

      if (body.command.kind === "open_url") {
        await fetch(COMMAND_RESULT_URL, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            commandId: body.command.id,
            ok: true,
            result: {
              url: body.command.payload.url,
              executor: "content-script",
            },
          }),
        });

        window.location.href = body.command.payload.url;
      }
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
