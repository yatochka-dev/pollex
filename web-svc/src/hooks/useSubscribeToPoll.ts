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

  // viewer count from SSE
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

    // vote updates
    eventSource.addEventListener("vote", (event) => {
      const data2 = event.data && JSON.parse(event.data);
      console.log("Vote update:", data2); // TODO remove this later
      const pollData = PollDataSchema.parse(data2);
      queryClient.setQueriesData({ queryKey }, pollData);
    });

    // viewer count updates
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
