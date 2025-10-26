import { useQuery } from "@tanstack/react-query";
import { getPath, parseErrorResponse } from "~/lib/api";
import {
  AuditLogsResponseSchema,
  type AuditLogsResponse,
} from "~/lib/types";

interface UseAuditLogsOptions {
  limit?: number;
  offset?: number;
  actorId?: string;
  action?: string;
}

async function fetchAuditLogs(
  limit: number,
  offset: number,
  actorId?: string,
  action?: string,
): Promise<AuditLogsResponse> {
  let url = `/admin/audit?limit=${limit}&offset=${offset}`;

  if (actorId) {
    url += `&actor_id=${actorId}`;
  }

  if (action) {
    url += `&action=${action}`;
  }

  const res = await fetch(getPath(url), {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    const error = await parseErrorResponse(res);
    throw new Error(error.message);
  }

  const json: unknown = await res.json();
  return AuditLogsResponseSchema.parse(json);
}

export function useAuditLogs(options: UseAuditLogsOptions = {}) {
  const { limit = 50, offset = 0, actorId, action } = options;

  return useQuery({
    queryKey: ["admin", "audit", limit, offset, actorId, action],
    queryFn: () => fetchAuditLogs(limit, offset, actorId, action),
    staleTime: 1000 * 60 * 2, // 2 minutes (audit logs change frequently)
  });
}
