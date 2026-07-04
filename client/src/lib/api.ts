/**
 * AEGIS API client.
 *
 * Talks to the FastAPI backend at /api/* via Next.js rewrites (proxied
 * to the FastAPI server in dev, same-origin in production behind the
 * Caddy reverse proxy).
 *
 * Mirrors the dataclasses in `backend/memory/base.py` and the
 * pydantic schemas in `backend/app/schemas.py`.
 */

const API_BASE = "/api";

export interface EvidenceItem {
  text: string;
  source: string;
  node_id: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface RecallResult {
  answer: string;
  evidence: EvidenceItem[];
  dataset_id: string | null;
}

export interface DatasetInfo {
  id: string;
  name: string;
  created_at: string | null;
  node_count: number;
  raw_size_bytes: number;
}

export interface GraphNode {
  id: string;
  label: string;
  name: string;
  properties: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
  properties: Record<string, unknown>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphStats {
  node_count: number;
  edge_count: number;
  node_type_counts: Record<string, number>;
  edge_type_counts: Record<string, number>;
  dataset_count: number;
  memory_quality_score: number;
}

export interface HealthStatus {
  healthy: boolean;
  backend: string;
  message: string;
  details: Record<string, unknown>;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let detail: string;
    try {
      const body = await res.json();
      detail = body.detail ?? JSON.stringify(body);
    } catch {
      detail = await res.text();
    }
    throw new Error(`API ${res.status} on ${path}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

// ──────────────────────────────────────────────────────────────────────
// Lifecycle — remember / recall / improve / forget
// ──────────────────────────────────────────────────────────────────────

export async function rememberText(
  content: string,
  datasetName?: string,
): Promise<{ message: string; dataset_id: string | null }> {
  return call("/sources/text", {
    method: "POST",
    body: JSON.stringify({ content, dataset_name: datasetName }),
  });
}

export async function rememberUrl(
  url: string,
  datasetName?: string,
): Promise<{ message: string; dataset_id: string | null }> {
  return call("/sources/url", {
    method: "POST",
    body: JSON.stringify({ url, dataset_name: datasetName }),
  });
}

export async function rememberGithub(
  repo: string,
  datasetName?: string,
): Promise<{ message: string; dataset_id: string | null }> {
  return call("/sources/github", {
    method: "POST",
    body: JSON.stringify({ repo, dataset_name: datasetName }),
  });
}

export async function rememberYoutube(
  urlOrId: string,
  datasetName?: string,
): Promise<{ message: string; dataset_id: string | null }> {
  return call("/sources/youtube", {
    method: "POST",
    body: JSON.stringify({ url_or_id: urlOrId, dataset_name: datasetName }),
  });
}

export async function rememberPdf(
  file: File,
  datasetName?: string,
): Promise<{ message: string; dataset_id: string | null }> {
  const form = new FormData();
  form.append("file", file);
  if (datasetName) form.append("dataset_name", datasetName);
  // Do NOT set Content-Type — browser must set it with the multipart boundary.
  const res = await fetch(`${API_BASE}/sources/pdf`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    let detail: string;
    try {
      const body = await res.json();
      detail = body.detail ?? JSON.stringify(body);
    } catch {
      detail = await res.text();
    }
    throw new Error(`API ${res.status} on /sources/pdf: ${detail}`);
  }
  return res.json() as Promise<{ message: string; dataset_id: string | null }>;
}

export async function recall(
  query: string,
  datasetId?: string,
): Promise<RecallResult> {
  return call("/memory/recall", {
    method: "POST",
    body: JSON.stringify({ query, dataset_id: datasetId }),
  });
}

export async function improve(datasetId?: string): Promise<{ message: string }> {
  return call("/memory/improve", {
    method: "POST",
    body: JSON.stringify({ dataset_id: datasetId }),
  });
}

export async function forget(datasetId: string): Promise<{ message: string }> {
  return call("/memory/forget", {
    method: "DELETE",
    body: JSON.stringify({ dataset_id: datasetId }),
  });
}

// ──────────────────────────────────────────────────────────────────────
// Dataset management + graph + stats + health
// ──────────────────────────────────────────────────────────────────────

export async function listDatasets(): Promise<DatasetInfo[]> {
  return call<DatasetInfo[]>("/datasets");
}

export const getDatasets = listDatasets;

export async function getGraph(datasetId?: string): Promise<GraphData> {
  const qs = datasetId ? `?dataset_id=${encodeURIComponent(datasetId)}` : "";
  return call<GraphData>(`/graph${qs}`);
}

export async function getStats(): Promise<GraphStats> {
  return call<GraphStats>("/stats");
}

export async function getHealth(): Promise<HealthStatus> {
  return call<HealthStatus>("/health");
}
