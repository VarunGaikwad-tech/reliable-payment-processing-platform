const { spawn } = require("child_process");

const children = [];
let shuttingDown = false;

const startProcess = (name, script) => {
  const child = spawn(process.execPath, [script], {
    stdio: "inherit",
    env: process.env,
  });

  children.push({ name, child });

  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }

    console.error(
      `${name} exited unexpectedly. code=${code} signal=${signal}`
    );

    shutdown(code || 1);
  });

  child.on("error", (error) => {
    console.error(`${name} failed to start:`, error);
    shutdown(1);
  });

  return child;
};

const shutdown = (exitCode = 0) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.log("Shutting down production processes...");

  for (const { child } of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }

  setTimeout(() => {
    for (const { child } of children) {
      if (!child.killed) {
        child.kill("SIGKILL");
      }
    }

    process.exit(exitCode);
  }, 5000);
};

// Always run the API.
startProcess("API server", "server.js");

// Only run workers when explicitly enabled.
// Local Docker keeps this unset.
// Render will set RUN_WORKERS=true.
if (process.env.RUN_WORKERS === "true") {
  startProcess("Outbox worker", "workers/outboxWorker.js");
  startProcess(
    "Notification worker",
    "workers/notificationWorker.js"
  );
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));