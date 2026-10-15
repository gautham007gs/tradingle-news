"use client";

import { useState, type CSSProperties } from "react";

interface StoryImageProps {
  src: string;
  alt: string;
  frameClassName: string;
  imageClassName?: string;
  frameStyle?: CSSProperties;
  staticImage?: boolean;
  sizes?: string;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
  decoding?: "sync" | "async" | "auto";
  imageStyle?: CSSProperties;
}

export default function StoryImage({
  src,
  alt,
  frameClassName,
  imageClassName,
  frameStyle,
  staticImage = false,
  sizes,
  loading = "lazy",
  fetchPriority = "auto",
  decoding = "async",
  imageStyle,
}: StoryImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <div className={frameClassName} style={{ position: "relative", ...frameStyle }}>
      {/* Publisher image hosts block Next's image proxy, so keep these as direct URLs. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        sizes={sizes}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding={decoding}
        style={staticImage ? {
          ...imageStyle,
          position: "static",
          display: "block",
          width: "100%",
          height: "100%",
          objectFit: "cover",
        } : {
          ...imageStyle,
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
        className={imageClassName}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
