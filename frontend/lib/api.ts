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
