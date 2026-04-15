export function Header() {
  const base = import.meta.env.BASE_URL;

  return (
    <header id="top" className="overflow-hidden border border-[#99ADC6]/40 bg-white">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="px-5 py-5 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#99ADC6]">Animal Rights Pulse</p>
          <h1 className="mt-2 text-[2rem] font-semibold leading-tight text-[#111111] sm:text-[2.15rem]">Emerging Trends</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4A678F]/76">
            A clear look at what’s actually trending and the data when you need to see it.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex h-[60px] w-[60px] items-center justify-center border border-[#99ADC6]/30 bg-[#F7FAFC]">
              <img src={`${base}che-logo.png`} alt="CHE logo" className="h-12 w-12 object-contain" />
            </div>
            <div className="flex h-[60px] w-[60px] items-center justify-center border border-[#99ADC6]/30 bg-[#F7FAFC]">
              <img src={`${base}awa-logo.png`} alt="AWA logo" className="h-12 w-12 object-contain" />
            </div>
          </div>
        </div>

        <div className="relative min-h-[240px] overflow-hidden border-t border-[#99ADC6]/30 lg:min-h-full lg:border-t-0">
          <img
            src={`${base}leopard.jpg`}
            alt="Leopard portrait"
            className="absolute inset-0 block h-full w-full scale-[1.7] object-cover"
            style={{ objectPosition: "right 38%" }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/72 via-28% to-transparent" />
          <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0)_40%,rgba(17,17,17,0.08)_78%,rgba(17,17,17,0.2)_100%)]" />
        </div>
      </div>
    </header>
  );
}
