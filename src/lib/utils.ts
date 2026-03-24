export function getIniciales(nombre: string, apellido: string): string {
  return `${nombre?.charAt(0) || ''}${apellido?.charAt(0) || ''}`.toUpperCase()
}

export function getAvatarColor(id: string): string {
  const colors = [
    "bg-[#E8A0B4]/20 text-[#C97A96]",
    "bg-[#2DB87A]/15 text-[#2DB87A]",
    "bg-[#4A4A55]/10 text-[#4A4A55]",
    "bg-[#F59E0B]/15 text-[#b07800]",
  ]
  let suma = 0
  for (let i = 0; i < id.length; i++) suma += id.charCodeAt(i)
  return colors[suma % colors.length]
}

export function mesActualStr(): string {
  const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
  const hoy = new Date()
  return `${meses[hoy.getMonth()]} ${hoy.getFullYear()}`
}

export function calcularEdad(fechaNac: string): string {
  if (!fechaNac) return "—"
  const hoy = new Date()
  const f = new Date(fechaNac + "T12:00:00")
  let edad = hoy.getFullYear() - f.getFullYear()
  if (hoy.getMonth() < f.getMonth() || (hoy.getMonth() === f.getMonth() && hoy.getDate() < f.getDate())) edad--
  return `${edad} años`
}
