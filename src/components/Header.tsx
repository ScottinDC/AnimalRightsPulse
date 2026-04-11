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
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 30%",
            opacity: 0.1,
            maskImage: "linear-gradient(to left, black 0%, transparent 60%)",
            WebkitMaskImage: "linear-gradient(to left, black 0%, transparent 60%)",
            pointerEvents: "none",
          }}
        />
      )}
      <div className="flex flex-col gap-4">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#99ADC6]">Animal Rights Signal Monitor</p>
          <h1 className="mt-2 text-[2rem] font-semibold leading-tight text-[#4A678F] sm:text-[2.15rem]">Trends and Insights Dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4A678F]/76">
            Static reporting for organic search growth, internal site queries, and emerging animal-rights topics across search,
            community, and news signals.
          </p>
        </div>
      </div>
    </header>
  );
}
