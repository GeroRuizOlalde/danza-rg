export default function ClasesLoading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header skeleton */}
      <div className="pt-[140px] px-[5%] md:px-[8%] pb-20 bg-gradient-to-br from-[#FDF0F4] to-[#F7F7F9]">
        <div className="max-w-7xl mx-auto">
          <div className="h-3 w-24 bg-[#E8A0B4]/20 rounded mb-4 animate-pulse" />
          <div className="h-12 w-80 bg-[#E8A0B4]/15 rounded-lg mb-4 animate-pulse" />
          <div className="h-5 w-96 bg-[#E8A0B4]/10 rounded animate-pulse" />
        </div>
      </div>

      {/* Filter skeleton */}
      <div className="py-10 px-[5%] md:px-[8%] border-b border-[#E8A0B4]/15">
        <div className="max-w-7xl mx-auto flex gap-3">
          {[1, 2, 3, 4, 5].map(n => (
            <div key={n} className="h-10 w-24 bg-[#E8A0B4]/10 rounded-full animate-pulse" />
          ))}
        </div>
      </div>

      {/* Cards skeleton */}
      <div className="py-16 px-[5%] md:px-[8%] max-w-7xl mx-auto">
        <div className="flex flex-col gap-10">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-[320px] bg-[#F7F7F9] rounded-3xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
