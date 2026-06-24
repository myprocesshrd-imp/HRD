import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry)),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

async function handleIdmsAuth(request: Request): Promise<Response> {
  try {
    const { account, password, Service, AgentId, AgentCode } = await request.json();
    const params = new URLSearchParams({
      account: account || "",
      password: password || "",
      Service: Service || "0000",
      AgentId: AgentId || "SystemMango",
      AgentCode: AgentCode || "Np4kfRh5",
    });
    const authUrl = "https://mobiledev.advanceagro.net/ws/api/idms/authentication/";
    const res = await fetch(`${authUrl}?${params}`);
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error("[IDMS Proxy] Auth error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

async function handleIdmsProfile(request: Request, env: unknown): Promise<Response> {
  try {
    const { empId, token } = await request.json();
    const envRecord = env as Record<string, string | undefined>;
    const baseUrl = envRecord?.VITE_IDMS_BASE_URL || "https://api-idms.advanceagro.net";
    const res = await fetch(`${baseUrl}/hrms/employee/${empId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error("[IDMS Proxy] Profile error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);

      if (url.pathname === "/api/idms-auth" && request.method === "POST") {
        return handleIdmsAuth(request);
      }
      if (url.pathname === "/api/idms-profile" && request.method === "POST") {
        return handleIdmsProfile(request, env);
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};
