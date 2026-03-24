export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F7F9]">
      <div className="w-10 h-10 border-[3px] border-[#E8A0B4]/30 border-t-[#C97A96] rounded-full animate-spin" />
      <p className="mt-4 text-sm text-[#8A8A99] font-medium">Cargando...</p>
    </div>
  )
}
