"use client";

import { CharacterObject } from "@/lib/api";
import dynamic from "next/dynamic";
import React from "react";

// cytoscape must be loaded only in the browser
const CytoscapeComponent = dynamic(() => import("react-cytoscapejs"), {
  ssr: false,
});

interface Props {
  characters: CharacterObject[];
}

const SENTIMENT_COLOR: Record<string, string> = {
  hostile: "#ff4b72", // neon-rose
  friendly: "#05f3ad", // neon-green
  neutral: "#94a3b8", // slate-400
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
            label: rel.type.toUpperCase(),
            sentiment: rel.sentiment,
          },
        });
      }
    });
  });

  return [...nodes, ...edges];
}

// eslint-disable-next-line
const STYLESHEET: any[] = [
  {
    selector: "node",
    style: {
      "background-color": "#0d1527",
      "border-width": 2,
      "border-color": "#0df0ff",
      "label": "data(label)",
      "color": "#f1f5f9",
      "font-size": "11px",
      "font-family": "var(--font-jakarta), system-ui, sans-serif",
      "text-valign": "center",
      "text-halign": "center",
      "width": 75,
      "height": 75,
      "text-wrap": "wrap",
      "text-max-width": "68px",
      "transition-property": "background-color border-color",
      "transition-duration": 0.2,
    } as cytoscape.Css.Node,
  },
  {
    selector: "node:selected",
    style: {
      "background-color": "#0df0ff",
      "border-width": 3,
      "border-color": "#ffffff",
      "color": "#060913",
      "font-weight": "bold",
    } as cytoscape.Css.Node,
  },
  {
    selector: 'edge[sentiment = "hostile"]',
    style: {
      "line-color": "#ff4b72",
      "target-arrow-color": "#ff4b72",
    } as cytoscape.Css.Edge,
  },
  {
    selector: 'edge[sentiment = "friendly"]',
    style: {
      "line-color": "#05f3ad",
      "target-arrow-color": "#05f3ad",
    } as cytoscape.Css.Edge,
  },
  {
    selector: "edge",
    style: {
      "width": 2,
      "line-color": "#475569",
      "target-arrow-color": "#475569",
      "target-arrow-shape": "triangle",
      "curve-style": "bezier",
      "label": "data(label)",
      "font-size": "8px",
      "font-family": "var(--font-mono), monospace",
      "color": "#94a3b8",
      "text-rotation": "autorotate",
      "text-background-color": "#060913",
      "text-background-opacity": 0.9,
      "text-background-padding": "3px",
    } as cytoscape.Css.Edge,
  },
];

export default function RelationshipGraph({ characters }: Props) {
  if (characters.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 rounded-xl border border-obsidian-border bg-obsidian-card text-sm text-slate-400 font-mono">
        No characters extracted yet.
      </div>
    );
  }

  const elements = buildElements(characters);

  return (
    <div className="rounded-2xl border border-obsidian-border overflow-hidden bg-[#060913] relative shadow-lg" style={{ height: 480 }}>
      {/* HUD scanner visual lines */}
      <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none z-10"></div>
      <div className="absolute top-2 left-3 font-mono text-[9px] text-slate-500 uppercase tracking-widest z-10">
        [SYS_RENDER: CHARACTER_ENTITIES_RELATIONS]
      </div>

      <CytoscapeComponent
        elements={elements}
        stylesheet={STYLESHEET}
        layout={{ name: "cose", animate: true, padding: 50, nodeOverlap: 20 } as any}
        style={{ width: "100%", height: "100%", background: "#060913" }}
        cy={(cy) => {
          if ((cy as any)._storyglide_initialized) return;
          (cy as any)._storyglide_initialized = true;

          // Prevent cytoscape crash on endBatch/fit/headless when destroyed (layout animations still running)
          const oldEndBatch = cy.endBatch;
          cy.endBatch = function (this: any) {
            try {
              return oldEndBatch.apply(this, arguments as any);
            } catch (err) {
              if (cy.destroyed() || !(cy as any).renderer()) {
                return this;
              }
              throw err;
            }
          };

          const oldFit = cy.fit;
          cy.fit = function (this: any) {
            try {
              return oldFit.apply(this, arguments as any);
            } catch (err) {
              if (cy.destroyed() || !(cy as any).renderer()) {
                return this;
              }
              throw err;
            }
          };

          const oldHeadless = (cy as any).headless;
          (cy as any).headless = function (this: any) {
            try {
              return oldHeadless.apply(this, arguments as any);
            } catch (err) {
              if (cy.destroyed() || !(cy as any).renderer()) {
                return true;
              }
              throw err;
            }
          };

          cy.on("layoutstop", () => {
            if (!cy.destroyed()) {
              cy.fit(undefined, 50);
            }
          });
        }}
        diff={(a: any, b: any) => {
          if (a === b) return false;
          if (!a || !b) return true;
          return JSON.stringify(a) !== JSON.stringify(b);
        }}
        get={(obj: any, key: string) => (obj ? obj[key] : null)}
        toJson={(obj: any) => obj}
        forEach={(list: any[], fn: any) => {
          if (list) list.forEach(fn);
        }}
      />
      
      <div className="absolute bottom-0 left-0 right-0 flex gap-4 px-4 py-3 bg-[#0a0f1d]/90 backdrop-blur-sm border-t border-obsidian-border text-[10px] font-mono uppercase tracking-wider text-slate-400 z-10">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-4 rounded-sm" style={{ background: "#ff4b72" }} />
          HOSTILE
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-4 rounded-sm" style={{ background: "#05f3ad" }} />
          FRIENDLY
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-4 rounded-sm" style={{ background: "#475569" }} />
          NEUTRAL
        </span>
        <span className="ml-auto text-[9px] text-slate-500">
          * DRAG NODES TO ORGANIZE NETWORKS
        </span>
      </div>
    </div>
  );
}
