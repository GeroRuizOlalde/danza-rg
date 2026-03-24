'use client'

export default function ClasesError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F7F9] px-6 text-center">
      <div className="text-5xl mb-4">😔</div>
      <h2 className="font-playfair text-2xl font-bold text-[#1A1A22] mb-2">
        No pudimos cargar las clases
      </h2>
      <p className="text-sm text-[#8A8A99] mb-8 max-w-md">
        Hubo un problema al obtener la información. Intentá de nuevo en unos segundos.
      </p>
      <button
        onClick={() => reset()}
        className="bg-[#C97A96] text-white px-8 py-3 rounded-full text-sm font-semibold hover:bg-[#1A1A22] transition-colors"
      >
        Intentar de nuevo
      </button>
    </div>
  )
}
