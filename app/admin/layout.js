import Link from "next/link";

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-5 py-4 flex items-center justify-between">
          <div className="font-semibold text-[#0a2230]">Admin</div>
          <div className="flex items-center gap-4 text-sm">
            <Link className="font-semibold text-[#0a2230] hover:underline" href="/admin/listings">
              Listings
            </Link>
            <Link className="font-semibold text-[#0a2230] hover:underline" href="/admin/users">
              Users
            </Link>
            <Link className="text-slate-600 hover:underline" href="/dashboard">
              Dashboard
            </Link>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
