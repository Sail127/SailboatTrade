// components/SpecTable.js
export default function SpecTable({ specs = {} }) {
  const entries = Object.entries(specs || {});
  if (!entries.length) {
    return <p className="text-white/70">No specifications provided.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-white/10">
      <table className="w-full text-left">
        <tbody className="divide-y divide-white/10">
          {entries.map(([k, v]) => (
            <tr key={k} className="odd:bg-white/0 even:bg-white/[0.03]">
              <th className="py-2.5 pl-4 pr-3 font-medium text-white/90 w-40">{k}</th>
              <td className="py-2.5 px-3 text-white/90">{String(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
