import Image from "next/image";

export default function SectionDivider() {
  return (
    <div className="relative mx-auto max-w-7xl px-5 md:px-8 mt-10 md:mt-12">
      {/* the line */}
      <div className="h-px w-full bg-white/10" />

      {/* centered burgee sitting on the line */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {/* patch behind the burgee so the line doesn’t show through */}
        <span className="bg-[#0e2230] px-3">
          <Image
            src="/st-burgee.svg"   // update path if needed
            alt="SailboatTrade burgee"
            width={44}
            height={24}
            priority
          />
        </span>
      </div>
    </div>
  );
}
