import * as React from "react";
import { PollCard } from "./poll";

interface PollPageProps {
  params: Promise<{
    pollId: string;
  }>;
}

export default async function PollPage(props: PollPageProps) {
  const { pollId } = await props.params;

  return (
    <div className="w-full max-w-2xl">
      <PollCard pollId={pollId} />
    </div>
  );
}
