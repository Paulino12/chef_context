

// app/page.tsx
import Link from "next/link";

export default function Home() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Chef Context</h1>
      <p>Go to the dashboard:</p>
      <Link className="underline" href="/dashboard">Open Dashboard</Link>
    </main>
  );
}

