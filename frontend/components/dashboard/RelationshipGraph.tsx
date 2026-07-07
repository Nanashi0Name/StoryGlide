"use client";

import { CharacterObject } from "@/lib/api";
import dynamic from "next/dynamic";
import React, { useEffect, useRef } from "react";

// cytoscape must be loaded only in the browser
const CytoscapeComponent = dynamic(() => import("react-cytoscapejs"), {
  ssr: false,
});

interface Props {
  characters: CharacterObject[];
}

const SENTIMENT_COLOR: Record<string, string> = {
  hostile: "#ef4444",
  friendly: "#22c55e",
  neutral: "#9ca3af",
};

function buildElements(characters: CharacterObject[]) {
  const nodes = characters.map((c) => ({
    data: { id: c.id, label: c.name },
  }));

  const edges: { data: { id: string; source: string; target: string; label: string; sentiment: string } }[] = [];
  const seen = new Set<string>();

  characters.forEach((c) => {
    c.relationships.forEach((rel) => {
      const key = [c.id, rel.target_id].sort().join("--");
      if (!seen.has(key)) {
        seen.add(key);
        edges.push({
          data: {
            id: key,
            source: c.id,
            target: rel.target_id,
            label: rel.type,
            sentiment: rel.sentiment,
          },
        });
      }
    });
  });

  return [...nodes, ...edges];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const STYLESHEET: any[] = [
  {
    selector: "node",
    style: {
      "background-color": "#3b82d4",
      "label": "data(label)",
      "color": "#ffffff",
      "font-size": "12px",
      "text-valign": "center",
      "text-halign": "center",
      "width": 80,
      "height": 80,
      "text-wrap": "wrap",
      "text-max-width": "70px",
    } as cytoscape.Css.Node,
  },
  {
    selector: "node:selected",
    style: {
      "background-color": "#1d4ed8",
      "border-width": 3,
      "border-color": "#ffffff",
    } as cytoscape.Css.Node,
  },
  {
    selector: 'edge[sentiment = "hostile"]',
    style: {
      "line-color": "#ef4444",
      "target-arrow-color": "#ef4444",
    } as cytoscape.Css.Edge,
  },
  {
    selector: 'edge[sentiment = "friendly"]',
    style: {
      "line-color": "#22c55e",
      "target-arrow-color": "#22c55e",
    } as cytoscape.Css.Edge,
  },
  {
    selector: "edge",
    style: {
      "width": 2,
      "line-color": "#9ca3af",
      "target-arrow-color": "#9ca3af",
      "target-arrow-shape": "triangle",
      "curve-style": "bezier",
      "label": "data(label)",
      "font-size": "10px",
      "color": "#57606a",
      "text-rotation": "autorotate",
      "text-background-color": "#f7f8fa",
      "text-background-opacity": 1,
      "text-background-padding": "2px",
    } as cytoscape.Css.Edge,
  },
];

export default function RelationshipGraph({ characters }: Props) {
  if (characters.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 rounded-xl border border-[#e5e7eb] bg-[#f7f8fa] text-sm text-[#57606a]">
        No characters extracted yet.
      </div>
    );
  }

  const elements = buildElements(characters);

  return (
    <div className="rounded-xl border border-[#e5e7eb] overflow-hidden" style={{ height: 480 }}>
      <CytoscapeComponent
        elements={elements}
        stylesheet={STYLESHEET}
        layout={{ name: "cose", animate: false, padding: 40 }}
        style={{ width: "100%", height: "100%", background: "#111827" }}
        cy={(cy) => {
          cy.on("layoutstop", () => cy.fit(undefined, 40));
        }}
      />
      <div className="flex gap-4 px-4 py-2 bg-[#111827] border-t border-gray-700 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-6 rounded" style={{ background: "#ef4444" }} />
          hostile
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-6 rounded" style={{ background: "#22c55e" }} />
          friendly
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-6 rounded" style={{ background: "#9ca3af" }} />
          neutral
        </span>
      </div>
    </div>
  );
}
