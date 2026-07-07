const API_URL =
  typeof window !== "undefined"
    ? "" // browser: use Next.js rewrites (relative URL → /api/…)
    : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000");

export interface UploadResponse {
  manuscript_id: string;
  status: string;
}

export interface StatusResponse {
  manuscript_id: string;
  status: string;
  error?: string;
}

export interface CharactersResponse {
  manuscript_id: string;
  characters: CharacterObject[];
}

export interface CharacterRelationship {
  target_id: string;
  type: string;
  sentiment: string;
}

export interface CharacterObject {
  id: string;
  name: string;
  aliases: string[];
  first_appearance: string;
  status_by_chapter: Record<string, string>;
  relationships: CharacterRelationship[];
  extracted_by: string;
}

export interface ContradictionFlag {
  id: string;
  type: string;
  entity: string;
  conflicting_chapters: string[];
  description: string;
  confidence: number;
}

export interface ContradictionsResponse {
  manuscript_id: string;
  contradictions: ContradictionFlag[];
}

export interface UnresolvedThread {
  id: string;
  type: string;
  introduced_chapter: string;
  description: string;
  resolved: boolean;
}

export interface ThreadsResponse {
  manuscript_id: string;
  threads: UnresolvedThread[];
}

export interface ArcDataPoint {
  chapter_id: string;
  tension_score: number;
  sentiment: string;
  dominant_emotion: string;
  word_count: number;
}

export interface ArcResponse {
  manuscript_id: string;
  arc: ArcDataPoint[];
}

export interface WhatIfRequest {
  scope: "character_death" | "relationship_change" | "event_removal";
  target_id: string;
  at_chapter: string;
}

export interface DownstreamImpact {
  chapter_id: string;
  impact: string;
}

export interface WhatIfResponse {
  summary: string;
  downstream_impacts: DownstreamImpact[];
}

export async function uploadManuscript(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_URL}/api/manuscripts`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `Upload failed (${res.status})`);
  }
  return res.json();
}

export async function pollStatus(manuscriptId: string): Promise<StatusResponse> {
  const res = await fetch(`${API_URL}/api/manuscripts/${manuscriptId}/status`);
  if (!res.ok) throw new Error(`Status check failed (${res.status})`);
  return res.json();
}

export async function fetchCharacters(manuscriptId: string): Promise<CharactersResponse> {
  const res = await fetch(`${API_URL}/api/manuscripts/${manuscriptId}/characters`);
  if (!res.ok) throw new Error(`Characters fetch failed (${res.status})`);
  return res.json();
}

export async function fetchContradictions(manuscriptId: string): Promise<ContradictionsResponse> {
  const res = await fetch(`${API_URL}/api/manuscripts/${manuscriptId}/contradictions`);
  if (!res.ok) throw new Error(`Contradictions fetch failed (${res.status})`);
  return res.json();
}

export async function fetchThreads(manuscriptId: string): Promise<ThreadsResponse> {
  const res = await fetch(`${API_URL}/api/manuscripts/${manuscriptId}/threads`);
  if (!res.ok) throw new Error(`Threads fetch failed (${res.status})`);
  return res.json();
}

export async function fetchArc(manuscriptId: string): Promise<ArcResponse> {
  const res = await fetch(`${API_URL}/api/manuscripts/${manuscriptId}/arc`);
  if (!res.ok) throw new Error(`Arc fetch failed (${res.status})`);
  return res.json();
}

export interface DashboardResponse {
  manuscript_id: string;
  characters: CharacterObject[];
  contradictions: ContradictionFlag[];
  threads: UnresolvedThread[];
  arc: ArcDataPoint[];
}

export async function fetchDashboard(manuscriptId: string): Promise<DashboardResponse> {
  const res = await fetch(`${API_URL}/api/manuscripts/${manuscriptId}/dashboard`);
  if (!res.ok) throw new Error(`Dashboard fetch failed (${res.status})`);
  return res.json();
}

export async function runWhatIf(
  manuscriptId: string,
  body: WhatIfRequest
): Promise<WhatIfResponse> {
  const res = await fetch(`${API_URL}/api/manuscripts/${manuscriptId}/whatif`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`What-if request failed (${res.status})`);
  return res.json();
}
