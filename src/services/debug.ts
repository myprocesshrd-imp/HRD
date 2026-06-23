const MAX_LOGS = 200;
const logs: { level: string; msg: string; time: string }[] = [];

export function pushLog(level: "log" | "warn" | "error", ...args: unknown[]) {
  const msg = args.map((a) => (typeof a === "object" ? JSON.stringify(a, null, 2) : String(a))).join(" ");
  logs.push({ level, msg, time: new Date().toLocaleTimeString() });
  if (logs.length > MAX_LOGS) logs.shift();
  const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  fn(`[${level.toUpperCase()}]`, ...args);
}

export function getLogs() {
  return [...logs];
}

export function clearLogs() {
  logs.length = 0;
}
