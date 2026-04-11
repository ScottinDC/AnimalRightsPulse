import cheLogoSrc from "../assets/che-logo.png";
import awaLogoSrc from "../assets/awa-logo.png";

interface HeaderProps {
  leopardImg?: string;
}

export function Header({ leopardImg }: HeaderProps) {
  return (
    <header id="top" className="relative overflow-hidden border-b border-[#99ADC6]/45 bg-white px-6 py-6 sm:px-8">
      {leopardImg && (
        <img
          src={leopardImg}
          alt=""
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "52%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 30%",
            opacity: 0.55,
            maskImage: "linear-gradient(to left, black 50%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to left, black 50%, transparent 100%)",
            pointerEvents: "none",
          }}
        />
      )}
      {/* Logos — full height, far right, above leopard */}
      <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, zIndex: 10, display: "flex", flexDirection: "column", backgroundColor: "white", padding: "16px 24px", gap: 12, minWidth: 160 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src={cheLogoSrc} alt="CHE" style={{ maxHeight: "100%", maxWidth: 140, objectFit: "contain" }} />
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src={awaLogoSrc} alt="AWA" style={{ maxHeight: "100%", maxWidth: 140, objectFit: "contain" }} />
        </div>
      </div>
      <div className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#99ADC6]">Animal Rights Signal</p>
        <h1 className="mt-2 text-[2rem] font-semibold leading-tight text-[#4A678F] sm:text-[2.15rem]">Trends and Insights Dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4A678F]/76">
          Static reporting for organic search growth, internal site queries, and emerging animal-rights topics across search,
          community, and news signals.
        </p>
      </div>
    </header>
  );
}
