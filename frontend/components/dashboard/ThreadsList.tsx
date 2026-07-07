"use client";

import { UnresolvedThread } from "@/lib/api";
import React from "react";

interface Props {
  threads: UnresolvedThread[];
}

const TYPE_STYLES: Record<string, string> = {
  chekhov_gun: "bg-purple-50 border-purple-200 text-purple-700",
  promise: "bg-blue-50 border-blue-200 text-blue-700",
  foreshadowing: "bg-indigo-50 border-indigo-200 text-indigo-700",
  question: "bg-teal-50 border-teal-200 text-teal-700",
};

const TYPE_LABELS: Record<string, string> = {
  chekhov_gun: "Chekhov's Gun",
  promise: "Promise",
  foreshadowing: "Foreshadowing",
  question: "Question",
};

export default function ThreadsList({ threads }: Props) {
  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 rounded-xl border border-[#e5e7eb] bg-[#f7f8fa] text-sm text-[#57606a] gap-2">
        <span className="text-2xl">✓</span>
        No unresolved threads — clean narrative pacing!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {threads.map((thread) => {
        const typeCls = TYPE_STYLES[thread.type] ?? "bg-gray-50 border-gray-200 text-gray-600";
        const typeLabel = TYPE_LABELS[thread.type] ?? thread.type.replace(/_/g, " ");

        return (
          <div
            key={thread.id}
            className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`rounded border px-2.5 py-0.5 text-xs font-semibold uppercase ${typeCls}`}>
                    {typeLabel}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-[#1f2328]">{thread.description}</p>
                <div className="mt-2 text-xs text-[#57606a]">
                  Introduced in:{" "}
                  <code className="rounded bg-[#f7f8fa] border border-[#e5e7eb] px-1.5 py-0.5 text-[#1f2328]">
                    {thread.introduced_chapter}
                  </code>
                </div>
              </div>
              {/* Status pill */}
              <div className="shrink-0 pt-0.5">
                {thread.resolved ? (
                  <span className="rounded-full bg-green-50 border border-green-200 px-3 py-1 text-xs font-semibold text-green-700">
                    Resolved
                  </span>
                ) : (
                  <span className="rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                    Open
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
