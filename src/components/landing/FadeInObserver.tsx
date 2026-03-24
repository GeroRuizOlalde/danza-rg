'use client'

import { useEffect } from 'react'

export default function FadeInObserver() {
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible') }),
      { threshold: 0.12 }
    )
    document.querySelectorAll('.fade-in').forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  return null
}
