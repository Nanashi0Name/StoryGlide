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
  hostile: "#8B2635", // crimson
  friendly: "#4B6B58", // sage
  neutral: "#8E8880", // ink-faded
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
      "background-color": "#FFFFFF",
      "border-width": 2,
      "border-color": "#B38F4D",
      "label": "data(label)",
      "color": "#1F1E1C",
      "font-size": "11px",
      "font-family": "var(--font-fraunces), Georgia, serif",
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
      "background-color": "#B38F4D",
      "border-width": 2,
      "border-color": "#1F1E1C",
      "color": "#FFFFFF",
      "font-weight": "bold",
    } as cytoscape.Css.Node,
  },
  {
    selector: "edge",
    style: {
      "width": 2,
      "line-color": "#B8B2A9",
      "target-arrow-color": "#B8B2A9",
      "target-arrow-shape": "triangle",
      "curve-style": "bezier",
      "label": "data(label)",
      "font-size": "8px",
      "font-family": "var(--font-jakarta), system-ui, sans-serif",
      "color": "#5A544F",
      "text-rotation": "autorotate",
      "text-background-color": "#FAF7F0",
      "text-background-opacity": 0.95,
      "text-background-padding": "3px",
    } as cytoscape.Css.Edge,
  },
  {
    selector: 'edge[sentiment = "hostile"]',
    style: {
      "line-color": "#8B2635",
      "target-arrow-color": "#8B2635",
    } as cytoscape.Css.Edge,
  },
  {
    selector: 'edge[sentiment = "friendly"]',
    style: {
      "line-color": "#4B6B58",
      "target-arrow-color": "#4B6B58",
    } as cytoscape.Css.Edge,
  },
];

export default function RelationshipGraph({ characters }: Props) {
  if (characters.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 rounded-xl border border-paper-border bg-paper-card text-sm text-ink-muted font-sans font-bold uppercase tracking-wider">
        No characters bound yet.
      </div>
    );
  }

  const elements = buildElements(characters);

  return (
    <div className="rounded-2xl border border-paper-border overflow-hidden bg-[#FAF7F0] relative shadow-book" style={{ height: 480 }}>
      {/* Subtle grid pattern overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none z-10"></div>
      <div className="absolute top-3 left-4 font-sans text-[9px] font-bold text-ink-muted uppercase tracking-wider z-10">
        Dramatis Personae Social Map
      </div>

      <CytoscapeComponent
        elements={elements}
        stylesheet={STYLESHEET}
        layout={{ name: "cose", animate: true, padding: 50, nodeOverlap: 20 } as any}
        style={{ width: "100%", height: "100%", background: "#FAF7F0" }}
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
      
      <div className="absolute bottom-0 left-0 right-0 flex gap-4 px-4 py-3.5 bg-paper-darker/95 backdrop-blur-sm border-t border-paper-border text-[10px] font-sans font-bold uppercase tracking-wider text-ink-muted z-10">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-4 rounded-sm" style={{ background: "#8B2635" }} />
          HOSTILE
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-4 rounded-sm" style={{ background: "#4B6B58" }} />
          FRIENDLY
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-4 rounded-sm" style={{ background: "#B8B2A9" }} />
          NEUTRAL
        </span>
        <span className="ml-auto text-[9px] text-ink-faded lowercase">
          * Drag characters to reorganize the social map
        </span>
      </div>
    </div>
  );
}
