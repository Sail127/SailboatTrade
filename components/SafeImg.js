"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";

const FALLBACK = "/boats/example-sailboat1.jpg";

export default function SafeImgClient({
  src,
  alt = "",
  className = "",
  loading = "lazy",
  draggable,
  style,
}) {
  const [cur, setCur] = useState(src || FALLBACK);

  useEffect(() => {
    setCur(src || FALLBACK);
  }, [src]);

  return (
    <img
      src={cur || FALLBACK}
      alt={alt}
      className={className}
      loading={loading}
      draggable={draggable}
      style={style}
      onError={() => {
        if (cur !== FALLBACK) setCur(FALLBACK);
      }}
    />
  );
}
