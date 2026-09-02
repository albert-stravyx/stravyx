import { ArtifactCategory, getArtifactCategory } from "@/stravyx/types";

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function categoryFor(name: string | null | undefined): ArtifactCategory {
  return (name ? getArtifactCategory(name) : null) ?? "visual_thermal";
}

export function errorMessage(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}
