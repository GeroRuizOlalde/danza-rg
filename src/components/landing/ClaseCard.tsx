'use client'

import { useState } from 'react'
import Image from 'next/image'
import { DEFAULT_CLASS_IMAGE, resolveClassImageUrl } from '@/lib/images'

export default function ClaseCard({
  clase,
}: {
  clase: { id: string; nombre: string; imagen_url?: string; etiqueta?: string; edades?: string }
}) {
  const [imageSrc, setImageSrc] = useState(resolveClassImageUrl(clase.imagen_url))

  return (
    <div className="rounded-[20px] overflow-hidden relative aspect-[3/4] bg-[#1A1A22] group hover:-translate-y-1.5 hover:shadow-[0_20px_48px_rgba(201,122,150,0.25)] transition-all duration-300">
      <Image
        src={imageSrc}
        alt={clase.nombre}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className="w-full h-full object-cover block"
        onError={() => setImageSrc(DEFAULT_CLASS_IMAGE)}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[rgba(26,26,34,0.92)] via-[rgba(26,26,34,0.3)] to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-6 z-[2]">
        <span className="inline-block bg-[#C97A96] text-white text-[0.68rem] px-3 py-1 rounded-full mb-2 font-medium">
          {clase.etiqueta || 'Danza'}
        </span>
        <h3 className="font-playfair text-xl font-semibold text-white m-0">
          {clase.nombre}
        </h3>
        {clase.edades && <p className="text-white/60 text-xs mt-1.5 font-light">{clase.edades}</p>}
      </div>
    </div>
  )
}
