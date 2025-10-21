/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import { env } from "~/env";
import { PollDataSchema, ViewersEventSchema, type PollData } from "~/lib/types";

async function getInitialData(id: string): Promise<PollData> {
  const u = new URL(`/polls/votes/${id}`, env.NEXT_PUBLIC_SERVER_URL);

  const response = await fetch(u);
  const data = await response.json();
  return PollDataSchema.parse(data);
}

export const useSubscribeToPoll = (pollId: string) => {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => [`poll`, `poll-${pollId}`], [pollId]);

  // Track viewer count from SSE events
  const [viewerCount, setViewerCount] = useState<number>(0);

  const { data, error } = useQuery({
    queryKey,
    queryFn: () => getInitialData(pollId),
  });

  useEffect(() => {
    const u = new URL(
      `/polls/votes/${pollId}/subscribe`,
      env.NEXT_PUBLIC_SERVER_URL,
    );

    const eventSource = new EventSource(u);

    eventSource.addEventListener("open", () => {
      console.log("SSE connection opened");
    });

    // Handle vote updates
    eventSource.addEventListener("vote", (event) => {
      const queryData = event.data && JSON.parse(event.data);
      console.log("Vote update:", queryData);
      const pollData = PollDataSchema.parse(queryData);
      queryClient.setQueriesData({ queryKey }, pollData);
    });

    // Handle viewer count updates
    eventSource.addEventListener("viewers", (event) => {
      const data = event.data && JSON.parse(event.data);
      console.log("Viewers update:", data);
      const viewersData = ViewersEventSchema.safeParse(data);
      if (viewersData.success) {
        setViewerCount(viewersData.data.viewerCount);
      }
    });

    eventSource.addEventListener("error", (error) => {
      console.error("SSE error:", error);
    });

    return () => {
      console.log("Closing SSE connection");
      eventSource.close();
    };
  }, [queryClient, pollId, queryKey]);

  return {
    poll: data,
    error,
    viewerCount,
  };
};
