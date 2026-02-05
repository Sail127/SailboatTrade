"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EditForm({ listing }) {
  const router = useRouter();
  const [title, setTitle] = useState(listing.title || "");
  const [description, setDescription] = useState(listing.description || "");
  const [err, setErr] = useState("");

  async function save(e) {
    e.preventDefault();
    setErr("");
    const res = await fetch(`/api/listings/${listing.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });
    const data = await res.json();
    if (!data.ok) return setErr(data.error || "Save failed.");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Edit Listing</h1>
      <form onSubmit={save} className="mt-6 space-y-3">
        <input className="w-full border rounded-md p-3" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
        <textarea className="w-full border rounded-md p-3 min-h-[140px]" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
        {err && <div className="text-sm text-red-600">{err}</div>}
        <button className="rounded-md bg-[#c8a44d] px-4 py-2 font-medium">Save</button>
      </form>
    </div>
  );
}
