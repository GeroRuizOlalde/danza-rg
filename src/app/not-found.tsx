import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F7F9] px-4 text-center font-dm-sans">
      <div className="text-6xl mb-6">💃</div>
      <h1 className="font-playfair text-5xl font-bold text-[#1A1A22] mb-4">404</h1>
      <p className="text-lg text-[#8A8A99] mb-8 max-w-md leading-relaxed">
        Parece que esta página no existe. Puede que el enlace esté roto o que la página haya sido movida.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 bg-[#C97A96] text-white px-8 py-3.5 rounded-full font-semibold text-sm hover:bg-[#1A1A22] transition-all shadow-md shadow-[#C97A96]/20"
      >
        Volver al inicio
      </Link>
    </div>
  )
}
