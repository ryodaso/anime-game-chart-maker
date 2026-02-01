"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";

type CellData = {
  label: string;
  imageUrl?: string;
};

type SearchType = "game" | "anime";

type SearchResult = {
  id: string;
  title: string;
  year?: number;
  imageUrl: string;
};

export default function Home() {
  const rows = 3;
  const cols = 6;

  // ====== Core state ======
  const [chartTitle, setChartTitle] = useState("About You: Video Games/Anime");

  const defaultLabels = useMemo(
    () => [
      "Favorite Game of all Time",
      "Favorite Series",
      "Best Soundtrack",
      "Favorite Protagonist",
      "Favorite Villain",
      "Best Story",
      "Have not played but want to",
      "You Love Everyone Hates",
      "You Hate Everyone Loves",
      "Best Art Style",
      "Favorite Ending",
      "Favorite Boss Fight",
      "Childhood Game",
      "Relaxing Game",
      "Stressful Game",
      "Game you always come back to",
      "Guilty Pleasure",
      "Tons of Hours Played",
    ],
    []
  );

  const [cells, setCells] = useState<CellData[]>(
    defaultLabels.map((label) => ({ label}))
  );

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selectedCell = selectedIndex !== null ? cells[selectedIndex] : null;

  function updateSelected(patch: Partial<CellData>) {
    if (selectedIndex === null) return;
    setCells((prev) => {
      const copy = [...prev];
      copy[selectedIndex] = { ...copy[selectedIndex], ...patch };
      return copy;
    });
  }

  // ====== Upload your own image ======
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleUploadImage(file: File) {
    if (selectedIndex === null) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file (png/jpg/webp/etc).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result); // e.g. data:image/png;base64,....
      updateSelected({ imageUrl: dataUrl });
    };
    reader.onerror = () => alert("Failed to read the image file.");
    reader.readAsDataURL(file);
  }

  // ====== Export PNG (title + grid only) ======
  const exportRef = useRef<HTMLDivElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  async function exportPng() {
    if (!exportRef.current) return;

    try {
      setIsExporting(true);

      const dataUrl = await toPng(exportRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      });

      const link = document.createElement("a");
      link.download = `${(chartTitle || "chart").replace(/[\\/:*?"<>|]/g, "")}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      alert(
        "Export failed. If this happens after adding external images, it may be a CORS issue. (Uploads should export reliably.)"
      );
    } finally {
      setIsExporting(false);
    }
  }

  // ====== Search modal state ======
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchType, setSearchType] = useState<SearchType>("game");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  async function runSearch() {
    const q = query.trim();
    if (!q) return;

    setIsSearching(true);
    setSearchError(null);
    setResults([]);

    try {
      const res = await fetch(`/api/search/${searchType}?q=${encodeURIComponent(q)}`);
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Search failed");
      }
      const data = (await res.json()) as { results: SearchResult[] };
      setResults(data.results || []);
    } catch (e: any) {
      setSearchError(e?.message ?? "Search failed");
    } finally {
      setIsSearching(false);
    }
  }

  function pickResult(r: SearchResult) {
    if (selectedIndex === null) return;
    updateSelected({ imageUrl: r.imageUrl });
    setIsSearchOpen(false);
  }

  function clearImage() {
    updateSelected({ imageUrl: undefined });
  }

  // ====== Modal UX improvements ======
  // 1) Close on Escape
  useEffect(() => {
    if (!isSearchOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsSearchOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSearchOpen]);

  // 2) Prevent background scrolling while modal open
  useEffect(() => {
    if (!isSearchOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isSearchOpen]);

  // ====== Layout choices ======
  const CELL_ASPECT = "2 / 3";
  const gridMaxWidth = 1100;

  // ====== Shared style helpers (font colors everywhere) ======
  const baseFont = "Arial, sans-serif";
  const black = "#000";
  const gray = "#666";
  const borderGray = "#ccc";

  const inputStyle: React.CSSProperties = {
    color: black,
    background: "white",
    border: `1px solid ${borderGray}`,
    borderRadius: 6,
    padding: 8,
    outline: "none",
  };

  const buttonStyle: React.CSSProperties = {
    color: black,
    background: "white",
    border: `1px solid ${borderGray}`,
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 800,
  };

  return (
    <div style={{ padding: 24, fontFamily: baseFont, color: black }}>
      <div style={{ maxWidth: 1500, margin: "0 auto" }}>

        {/* SEO-only H1 (hidden visually, readable by search engines) */}
        <h1 style={{ position: "absolute", left: "-9999px" }}>
          Anime & Video Game Chart Maker
        </h1>


        {/* Controls row (NOT exported) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <div style={{ fontWeight: 900, color: black }}>Controls</div>

          <button
            onClick={exportPng}
            disabled={isExporting}
            style={{
              ...buttonStyle,
              height: 40,
              padding: "0 14px",
              background: isExporting ? "#eee" : "white",
              cursor: isExporting ? "not-allowed" : "pointer",
            }}
          >
            {isExporting ? "Exporting..." : "Export PNG"}
          </button>
        </div>

        <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* EXPORT AREA: Title + Grid */}
          <div style={{ maxWidth: gridMaxWidth, width: "100%", flex: 1, minWidth: 0 }}>
            <div
              ref={exportRef}
              style={{
                background: "white",
                padding: 16,
                borderRadius: 12,
              }}
            >
              {/* Title (exported) */}
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <input
                  value={chartTitle}
                  onChange={(e) => setChartTitle(e.target.value)}
                  style={{
                    fontSize: 32,
                    fontWeight: 900,
                    textAlign: "center",
                    border: "none",
                    outline: "none",
                    width: "100%",
                    background: "transparent",
                    color: black,
                  }}
                />
                
              </div>

              {/* Grid (exported) */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${cols}, 1fr)`,
                  gap: 12,
                }}
              >
                {Array.from({ length: rows * cols }).map((_, i) => {
                  const cell = cells[i] ?? { label: `Cell ${i + 1}`, bg: "#ffffff" };
                  const isSelected = i === selectedIndex;

                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedIndex(i)}
                      style={{
                        border: isSelected ? "4px solid #0070f3" : "2px solid black",
                        aspectRatio: CELL_ASPECT,
                        position: "relative",
                        cursor: "pointer",
                        padding: 0,
                        textAlign: "left",
                        width: "100%",
                        overflow: "hidden",
                      }}
                    >
                      {/* Cover image */}
                      {cell.imageUrl ? (
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            backgroundImage: `url(${cell.imageUrl})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }}
                        />
                      ) : null}

                      {/* Label strip */}
                      <div
                        style={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          right: 0,
                          padding: "8px 8px",
                          fontSize: 14,
                          fontWeight: 900,
                          color: black,
                          background: "rgba(255,255,255,0.88)",
                          lineHeight: 1.2,
                        }}
                      >
                        {cell.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Editor Panel (NOT exported) */}
          <div
            style={{
              width: 320,
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: 16,
              color: black,
              background: "white",
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 12, color: black }}>Editor</div>

            {/* Hidden file input for Upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadImage(file);
                // reset so the same file can be selected again
                e.currentTarget.value = "";
              }}
            />

            {selectedCell ? (
              <>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 6, color: black }}>
                    Label
                  </div>
                  <input
                    value={selectedCell.label}
                    onChange={(e) => updateSelected({ label: e.target.value })}
                    style={{
                      ...inputStyle,
                      width: "100%",
                      height: 38,
                      padding: "0 10px",
                    }}
                  />
                </div>

                {/* Image controls: Search / Upload / Clear */}
                <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                  <button
                    onClick={() => setIsSearchOpen(true)}
                    style={{
                      ...buttonStyle,
                      flex: 1,
                      height: 40,
                    }}
                  >
                    Search
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      ...buttonStyle,
                      flex: 1,
                      height: 40,
                    }}
                  >
                    Upload
                  </button>

                  <button
                    onClick={clearImage}
                    style={{
                      ...buttonStyle,
                      width: 90,
                      height: 40,
                    }}
                  >
                    Clear
                  </button>
                </div>

                <div style={{ fontSize: 12, color: gray }}>
                  Tip: Upload is great for custom covers/personal images and exports reliably.
                </div>
              </>
            ) : (
              <div style={{ color: gray }}>Click a cell to edit it.</div>
            )}
          </div>
        </div>

        {/* Search Modal */}
        {isSearchOpen ? (
          <div
            onClick={() => setIsSearchOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
              zIndex: 9999,
            }}
          >
            {/* Modal panel */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 900,
                maxWidth: "100%",
                maxHeight: "90vh",
                background: "white",
                borderRadius: 12,
                border: "1px solid #ddd",
                padding: 0,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                color: black,
              }}
            >
              {/* Sticky header */}
              <div
                style={{
                  position: "sticky",
                  top: 0,
                  background: "white",
                  padding: 16,
                  borderBottom: "1px solid #eee",
                  zIndex: 1,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontWeight: 900, fontSize: 18, color: black }}>
                    Search covers
                  </div>
                  <button
                    onClick={() => setIsSearchOpen(false)}
                    style={{
                      ...buttonStyle,
                      padding: "6px 10px",
                      height: 34,
                      fontWeight: 900,
                    }}
                    title="Close (Esc)"
                  >
                    Close
                  </button>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                  <select
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value as SearchType)}
                    style={{
                      height: 40,
                      borderRadius: 8,
                      border: `1px solid ${borderGray}`,
                      padding: "0 10px",
                      fontWeight: 800,
                      color: black,
                      background: "white",
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option value="game">Games</option>
                    <option value="anime">Anime</option>
                  </select>

                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") runSearch();
                    }}
                    placeholder={`Search ${searchType}...`}
                    style={{
                      flex: 1,
                      minWidth: 200,
                      height: 40,
                      borderRadius: 8,
                      border: `1px solid ${borderGray}`,
                      padding: "0 10px",
                      color: black,
                      background: "white",
                      outline: "none",
                    }}
                  />

                  <button
                    onClick={runSearch}
                    disabled={isSearching}
                    style={{
                      ...buttonStyle,
                      height: 40,
                      padding: "0 14px",
                      background: isSearching ? "#eee" : "white",
                      cursor: isSearching ? "not-allowed" : "pointer",
                      fontWeight: 900,
                    }}
                  >
                    {isSearching ? "Searching..." : "Search"}
                  </button>
                </div>

                {searchError ? (
                  <div style={{ marginTop: 10, color: "crimson", fontSize: 12 }}>
                    {searchError}
                  </div>
                ) : null}
              </div>

              {/* Scrollable results area */}
              <div
                style={{
                  padding: 16,
                  overflowY: "auto",
                  flex: 1,
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                    gap: 12,
                  }}
                >
                  {results.map((r) => (
                    <button
                      key={`${searchType}-${r.id}`}
                      onClick={() => pickResult(r)}
                      style={{
                        border: "1px solid #ddd",
                        borderRadius: 10,
                        overflow: "hidden",
                        background: "white",
                        cursor: "pointer",
                        textAlign: "left",
                        padding: 0,
                        color: black,
                      }}
                      title={r.title}
                    >
                      <div
                        style={{
                          width: "100%",
                          aspectRatio: "2 / 3",
                          backgroundImage: `url(${r.imageUrl})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }}
                      />
                      <div style={{ padding: 10 }}>
                        <div
                          style={{
                            fontWeight: 900,
                            fontSize: 12,
                            lineHeight: 1.2,
                            color: black,
                          }}
                        >
                          {r.title}
                        </div>
                        {r.year ? (
                          <div style={{ fontSize: 11, color: gray, marginTop: 4 }}>{r.year}</div>
                        ) : null}
                      </div>
                    </button>
                  ))}
                </div>

                {results.length === 0 && !isSearching ? (
                  <div style={{ marginTop: 12, color: gray, fontSize: 12 }}>
                    Search for a title, then click a result to set the cell image.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}