"use client";

import dynamic from "next/dynamic";

const EarthExplorer = dynamic(() => import("@/components/EarthExplorer"), {
  ssr: false,
  loading: () => <div className="loading">Preparing Earth…</div>
});

export default function Home() {
  return <main><EarthExplorer /></main>;
}
