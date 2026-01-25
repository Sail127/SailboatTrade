// components/Burgee.js
// A scalable, code-drawn SailboatTrade burgee (navy pennant with gold trim, S • sailboat • T)

export default function Burgee({
  width = 160,       // overall width in px
  navy = "#0e2230",  // pennant fill
  gold = "#c8a44d",  // border color
  className = "",
  title = "SailboatTrade burgee",
}) {
  // maintain a pleasant banner aspect; adjust viewBox if you want it taller/shorter
  const viewW = 640;
  const viewH = 240;

  return (
    <svg
      width={width}
      height={(width / viewW) * viewH}
      viewBox={`0 0 ${viewW} ${viewH}`}
      role="img"
      aria-label={title}
      className={className}
    >
      <title>{title}</title>

      {/* Outer pennant (rounded tip) */}
      <path
        d="
          M 18 20
          L 520 20
          Q 622 120 520 220
          L 18 220
          Z
        "
        fill={navy}
        stroke={gold}
        strokeWidth="28"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* S and T — classic serif for that burgee vibe */}
      <text
        x="115" y="140"
        fontFamily="Georgia, 'Times New Roman', Times, serif"
        fontWeight="700"
        fontSize="84"
        fill="#ffffff"
        textAnchor="middle"
      >
        S
      </text>

      <text
        x="495" y="140"
        fontFamily="Georgia, 'Times New Roman', Times, serif"
        fontWeight="700"
        fontSize="84"
        fill="#ffffff"
        textAnchor="middle"
      >
        T
      </text>

      {/* Sail & hull (center) */}
      <g transform="translate(0,4)" fill="#ffffff" stroke="none">
        {/* mainsail */}
        <path d="
          M 330 50
          L 280 185
          L 390 185
          Z
        " />
        {/* hull */}
        <path d="
          M 260 190
          C 300 200, 355 200, 400 190
          L 388 202
          C 340 210, 300 210, 270 204
          Z
        " />
      </g>

      {/* wave accents under hull (stroked lines) */}
      <g fill="none" stroke="#ffffff" strokeWidth="8" strokeLinecap="round">
        <path d="M 265 208 C 295 220, 340 220, 385 208" />
        <path d="M 275 224 C 310 232, 345 232, 378 224" />
      </g>
    </svg>
  );
}
