export function Header() {
  const base = import.meta.env.BASE_URL;

  return (
    <header id="top" className="bg-white px-5 py-5 sm:px-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#99ADC6]">Animal Rights Signal</p>
          <h1 className="mt-2 text-[2rem] font-semibold leading-tight text-[#000000] sm:text-[2.15rem]">Trends and Insights Dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4A678F]/76">
            Static reporting for organic search growth, internal site queries, and emerging animal-rights topics across search,
            community, and news signals.
          </p>
        </div>

        <div className="relative -mr-5 -my-5 m-0 h-40 w-full max-w-[390px] self-stretch overflow-hidden p-0 sm:-mr-7 sm:h-44 sm:max-w-[420px]">
          <img
            src={`${base}leopard.jpg`}
            alt="Leopard portrait"
            className="absolute inset-0 m-0 block h-full w-full scale-[1.6] p-0 object-cover opacity-50"
            style={{ objectPosition: "right 58%" }}
          />
          <div className="absolute inset-y-0 left-0 w-[58%] bg-gradient-to-r from-white via-white/82 to-transparent" />
          <div className="absolute right-0 top-0 z-10 flex h-full w-20 flex-col items-stretch sm:w-[88px]">
            <div className="flex h-1/2 items-center justify-center bg-white p-2">
              <img src={`${base}che-logo.png`} alt="CHE logo" className="h-full w-full object-contain" />
            </div>
            <div className="flex h-1/2 items-center justify-center bg-white p-2">
              <img src={`${base}awa-logo.png`} alt="AWA logo" className="h-full w-full object-contain" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
