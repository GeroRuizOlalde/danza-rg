-- ============================================================
-- MIGRACIÓN: Lógica de negocio R.G Danza
-- Ejecutar en Supabase SQL Editor (en orden)
-- ============================================================

-- 1. TABLA alumna_clases (inscripciones de alumnas en clases)
CREATE TABLE IF NOT EXISTS alumna_clases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alumna_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  clase_id UUID NOT NULL REFERENCES clases(id) ON DELETE CASCADE,
  estado VARCHAR(20) NOT NULL DEFAULT 'prueba'
    CHECK (estado IN ('prueba', 'activa', 'baja')),
  fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_baja DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(alumna_id, clase_id)
);

CREATE INDEX IF NOT EXISTS idx_alumna_clases_alumna ON alumna_clases(alumna_id);
CREATE INDEX IF NOT EXISTS idx_alumna_clases_clase ON alumna_clases(clase_id);
CREATE INDEX IF NOT EXISTS idx_alumna_clases_estado ON alumna_clases(estado);

-- RLS para alumna_clases
ALTER TABLE alumna_clases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura pública alumna_clases" ON alumna_clases
  FOR SELECT USING (true);

CREATE POLICY "Admin full access alumna_clases" ON alumna_clases
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data ->> 'role') = 'admin'
    )
  );

-- 2. COLUMNA perfil_id en reservas (link reserva → perfil)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservas' AND column_name = 'perfil_id'
  ) THEN
    ALTER TABLE reservas ADD COLUMN perfil_id UUID REFERENCES perfiles(id) ON DELETE SET NULL;
    CREATE INDEX idx_reservas_perfil ON reservas(perfil_id);
  END IF;
END $$;

-- 3. COLUMNA cupo_maximo en horarios
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'horarios' AND column_name = 'cupo_maximo'
  ) THEN
    ALTER TABLE horarios ADD COLUMN cupo_maximo INTEGER DEFAULT 20;
  END IF;
END $$;

-- 4. COLUMNA cuota_mensual en academia_info
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'academia_info' AND column_name = 'cuota_mensual'
  ) THEN
    ALTER TABLE academia_info ADD COLUMN cuota_mensual NUMERIC(10,2) DEFAULT 0;
  END IF;
END $$;

-- 5. COLUMNA mes_periodo en pagos (formato YYYY-MM para queries confiables)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pagos' AND column_name = 'mes_periodo'
  ) THEN
    ALTER TABLE pagos ADD COLUMN mes_periodo VARCHAR(7);
    -- Backfill desde fecha_pago
    UPDATE pagos SET mes_periodo =
      EXTRACT(YEAR FROM fecha_pago)::TEXT || '-' ||
      LPAD(EXTRACT(MONTH FROM fecha_pago)::INT::TEXT, 2, '0')
    WHERE mes_periodo IS NULL;
  END IF;
END $$;

-- 6. TABLA profesores
CREATE TABLE IF NOT EXISTS profesores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL DEFAULT '',
  telefono VARCHAR(50),
  disciplina VARCHAR(100) NOT NULL DEFAULT '',
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profesores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura pública profesores" ON profesores;
CREATE POLICY "Lectura pública profesores" ON profesores
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin full access profesores" ON profesores;
CREATE POLICY "Admin full access profesores" ON profesores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data ->> 'role') = 'admin'
    )
  );

-- 7. TABLA asistencia_profesores
CREATE TABLE IF NOT EXISTS asistencia_profesores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profesor_id UUID NOT NULL REFERENCES profesores(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  presente BOOLEAN NOT NULL DEFAULT false,
  nota TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profesor_id, fecha)
);

CREATE INDEX IF NOT EXISTS idx_asistencia_prof_fecha ON asistencia_profesores(fecha);
CREATE INDEX IF NOT EXISTS idx_asistencia_prof_prof ON asistencia_profesores(profesor_id);

ALTER TABLE asistencia_profesores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura pública asistencia_profesores" ON asistencia_profesores;
CREATE POLICY "Lectura pública asistencia_profesores" ON asistencia_profesores
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin full access asistencia_profesores" ON asistencia_profesores;
CREATE POLICY "Admin full access asistencia_profesores" ON asistencia_profesores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data ->> 'role') = 'admin'
    )
  );

-- Si las tablas ya existían pero faltaba la columna "presente":
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'asistencia_profesores' AND column_name = 'presente'
  ) THEN
    ALTER TABLE asistencia_profesores ADD COLUMN presente BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- 8. COLUMNA origen en reservas (para distinguir landing vs turnero)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservas' AND column_name = 'origen'
  ) THEN
    ALTER TABLE reservas ADD COLUMN origen VARCHAR(20);
    -- Backfill: las que tienen "A coordinar" probablemente vinieron de la landing
    UPDATE reservas SET origen = 'landing' WHERE horario = 'A coordinar';
    UPDATE reservas SET origen = 'turnero' WHERE horario != 'A coordinar' AND origen IS NULL;
  END IF;
END $$;

-- 9. Intentar vincular reservas existentes con perfiles por teléfono
UPDATE reservas r
SET perfil_id = p.id
FROM perfiles p
WHERE r.perfil_id IS NULL
  AND r.telefono IS NOT NULL
  AND r.telefono != ''
  AND REGEXP_REPLACE(r.telefono, '\D', '', 'g') = REGEXP_REPLACE(p.telefono, '\D', '', 'g');
