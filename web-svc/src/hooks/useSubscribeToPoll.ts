/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import { getPath, parseErrorResponse } from "~/lib/api";
import { PollDataSchema, ViewersEventSchema, type PollData } from "~/lib/types";

async function getInitialData(id: string): Promise<PollData> {
  const response = await fetch(getPath(`/polls/votes/${id}`));

  if (!response.ok) {
    const error = await parseErrorResponse(response);
    throw new Error(error.message);
  }

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
    const u = getPath(`/polls/votes/${pollId}/subscribe`);

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
