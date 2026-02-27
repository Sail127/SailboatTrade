export default function BrandWordmark({
  className = "",
  tone = "dark",
  showDotCom = true,
}) {
  const isDark = tone === "dark";

  const sailColor = isDark ? "text-white" : "text-[#0a2230]";
  const dotComColor = isDark ? "text-white" : "text-[#0a2230]";
  const shadow = isDark ? "0 1px 0 rgba(0,0,0,0.55), 0 0 10px rgba(0,0,0,0.18)" : "none";

  return (
    <span
      className={["inline-block", className].filter(Boolean).join(" ")}
      style={{
        fontFamily: "var(--font-brand, inherit)",
        letterSpacing: "0.03em",
        textShadow: shadow,
      }}
      aria-label={showDotCom ? "SailboatTrade.com" : "SailboatTrade"}
    >
      <span className={sailColor}>Sailboat</span>
      <span className="text-[#f3b23f]">Trade</span>
      {showDotCom ? (
        <span className={dotComColor} style={{ letterSpacing: "0.06em" }}>
          .com
        </span>
      ) : null}
    </span>
  );
}
