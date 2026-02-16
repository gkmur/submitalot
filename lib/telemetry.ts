import "server-only";

type TelemetryLevel = "info" | "warn" | "error";

type TelemetryPayload = Record<string, unknown>;

const DEFAULT_SAMPLE_RATE = parseSampleRate(process.env.TELEMETRY_SAMPLE_RATE, 1);
const TELEMETRY_ENABLED = process.env.TELEMETRY_ENABLED !== "false";

function parseSampleRate(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed <= 0) return 0;
  if (parsed >= 1) return 1;
  return parsed;
}

export function shouldSample(rate = DEFAULT_SAMPLE_RATE) {
  return Math.random() < rate;
}

export function trackTelemetry(
  event: string,
  payload: TelemetryPayload,
  level: TelemetryLevel = "info"
) {
  if (!TELEMETRY_ENABLED) return;

  const entry = {
    ts: new Date().toISOString(),
    event,
    ...payload,
  };

  const line = `[telemetry] ${JSON.stringify(entry)}`;
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}
