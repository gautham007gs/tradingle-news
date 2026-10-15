import MpaLink from "@/components/MpaLink";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "default" | "footer";
}

const sizes = {
  sm: { fontSize: "18px", dotSize: "4px", dotMargin: "2px" },
  md: { fontSize: "22px", dotSize: "5px", dotMargin: "2px" },
  lg: { fontSize: "26px", dotSize: "6px", dotMargin: "3px" },
};

const Logo = ({ size = "md", variant = "default" }: LogoProps) => {
  const s = sizes[size];

  return (
    <MpaLink
      to="/"
      className={`inline-flex min-w-0 items-baseline select-none group trd-logo ${variant === "footer" ? "trd-logo--footer" : ""}`}
      aria-label="Tradingle home"
    >
      <span
        className="trd-logo-text whitespace-nowrap"
        style={{
          fontSize: s.fontSize,
          letterSpacing: "2px",
          lineHeight: 1,
          fontFamily: "'Roboto', sans-serif",
          textTransform: "uppercase",
        }}
      >
        <span className="trd-logo-part trd-logo-part--light">TRAD</span>
        <span className="trd-logo-part trd-logo-part--bold">INGLE</span>
      </span>
      <span
        className="trd-logo-dot group-hover:scale-125"
        style={{
          width: s.dotSize,
          height: s.dotSize,
          marginLeft: s.dotMargin,
        }}
        aria-hidden
      />
    </MpaLink>
  );
};

export default Logo;
