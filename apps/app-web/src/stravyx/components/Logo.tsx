import { LOGO_SRC, WHITE_LOGO_SRC } from "../assets";

interface LogoProps {
  className?: string;
  alt?: string;
  variant?: "default" | "white";
}

export function Logo({ className = "h-10", alt = "Stravyx", variant = "default" }: LogoProps) {
  return (
    <img
      src={variant === "white" ? WHITE_LOGO_SRC : LOGO_SRC}
      alt={alt}
      className={className}
      style={{ objectFit: "contain" }}
    />
  );
}
