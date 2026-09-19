import { config } from "../config.ts";
import type { ReferencePaper } from "../../../shared/types.ts";

const UA = `BookPilot/1.0 (mailto:${config.contactEmail})`;

function uniqKey(p: ReferencePaper) {
  return (p.doi || p.url || p.title).toLowerCase();
}

function yearFrom(value: unknown): number | null {
  if (typeof value === "number" && value > 1800) return value;
  if (typeof value === "string") {
    const m = value.match(/(\d{4})/);
    return m ? Number(m[1]) : null;
  }
  return null;
}

async function semanticScholar(query: string): Promise<ReferencePaper[]> {
  const url = new URL("https://api.semanticscholar.org/graph/v1/paper/search");
  url.searchParams.set("query", query);
  url.searchParams.set("limit", "5");
  url.searchParams.set("fields", "title,year,authors,url,externalIds");
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    data?: Array<{
      title?: string;
      year?: number;
      url?: string;
      authors?: { name?: string }[];
      externalIds?: { DOI?: string; ArXiv?: string };
    }>;
  };
  return (data.data ?? [])
    .filter((p) => p.title && (p.url || p.externalIds?.DOI))
    .map((p) => ({
      title: p.title!,
      authors: (p.authors ?? []).map((a) => a.name ?? "").filter(Boolean).slice(0, 6),
      year: p.year ?? null,
      url: p.url || (p.externalIds?.DOI ? `https://doi.org/${p.externalIds.DOI}` : `https://arxiv.org/abs/${p.externalIds?.ArXiv}`),
      source: "semantic_scholar" as const,
      doi: p.externalIds?.DOI ?? null,
    }));
}

async function openAlex(query: string): Promise<ReferencePaper[]> {
  const url = new URL("https://api.openalex.org/works");
  url.searchParams.set("search", query);
  url.searchParams.set("per_page", "5");
  url.searchParams.set("mailto", config.contactEmail);
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    results?: Array<{
      display_name?: string;
      publication_year?: number;
      doi?: string;
      id?: string;
      authorships?: { author?: { display_name?: string } }[];
      primary_location?: { landing_page_url?: string };
    }>;
  };
  return (data.results ?? [])
    .filter((w) => w.display_name)
    .map((w) => {
      const doi = w.doi?.replace("https://doi.org/", "") ?? null;
      const url =
        w.primary_location?.landing_page_url ||
        (doi ? `https://doi.org/${doi}` : w.id) ||
        "";
      return {
        title: w.display_name!,
        authors: (w.authorships ?? [])
          .map((a) => a.author?.display_name ?? "")
          .filter(Boolean)
          .slice(0, 6),
        year: w.publication_year ?? null,
        url,
        source: "openalex" as const,
        doi,
      };
    })
    .filter((p) => p.url);
}

async function arxiv(query: string): Promise<ReferencePaper[]> {
  const url = new URL("https://export.arxiv.org/api/query");
  url.searchParams.set("search_query", `all:${query}`);
  url.searchParams.set("start", "0");
  url.searchParams.set("max_results", "4");
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return [];
  const xml = await res.text();
  const entries = xml.split("<entry>").slice(1);
  return entries.map((entry) => {
    const title = (entry.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "").replace(/\s+/g, " ").trim();
    const published = entry.match(/<published>([\s\S]*?)<\/published>/)?.[1] ?? "";
    const id = (entry.match(/<id>([\s\S]*?)<\/id>/)?.[1] ?? "").trim();
    const authors = [...entry.matchAll(/<name>([\s\S]*?)<\/name>/g)].map((m) => m[1]!.trim());
    return {
      title,
      authors: authors.slice(0, 6),
      year: yearFrom(published),
      url: id,
      source: "arxiv" as const,
      doi: null,
    };
  }).filter((p) => p.title && p.url);
}

export async function searchRealPapers(queries: string[]): Promise<ReferencePaper[]> {
  const uniqueQueries = [...new Set(queries.map((q) => q.trim()).filter(Boolean))].slice(0, 3);
  const batches = await Promise.all(
    uniqueQueries.flatMap((q) => [semanticScholar(q), openAlex(q), arxiv(q)]),
  );
  const merged: ReferencePaper[] = [];
  const seen = new Set<string>();
  for (const paper of batches.flat()) {
    const key = uniqKey(paper);
    if (!paper.title || !paper.url || seen.has(key)) continue;
    seen.add(key);
    merged.push(paper);
    if (merged.length >= 5) break;
  }
  return merged;
}
