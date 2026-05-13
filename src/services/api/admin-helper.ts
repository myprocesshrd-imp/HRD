import { supabase } from "@/lib/supabase";

export async function invokeAdminService(action: string, payload: any, actorId?: string) {
  let effectiveActorId = actorId;
  
  if (!effectiveActorId && typeof window !== "undefined") {
    const session = localStorage.getItem("hrpulse.session");
    if (session) {
      try {
        const user = JSON.parse(session);
        effectiveActorId = user.employeeCode;
      } catch {}
    }
  }

  const { data, error } = await supabase.functions.invoke("admin-service", {
    body: { action, payload, actorId: effectiveActorId },
  });


  if (error) {
    console.error(`[AdminService] Error executing ${action}:`, error);
    throw new Error(error.message || `Failed to execute ${action}`);
  }

  return data?.data;
}
