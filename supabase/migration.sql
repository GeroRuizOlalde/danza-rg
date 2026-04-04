-- ============================================================
-- MIGRACION: Logica de negocio R.G Danza
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. TABLA alumna_clases
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

ALTER TABLE alumna_clases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica alumna_clases" ON alumna_clases;
DROP POLICY IF EXISTS "Lectura pÃºblica alumna_clases" ON alumna_clases;
DROP POLICY IF EXISTS "Lectura privada alumna_clases" ON alumna_clases;
CREATE POLICY "Lectura privada alumna_clases" ON alumna_clases
  FOR SELECT USING (
    alumna_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM auth.users
      WHERE auth.users.id = auth.uid()
        AND (auth.users.raw_app_meta_data ->> 'role') = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin full access alumna_clases" ON alumna_clases;
CREATE POLICY "Admin full access alumna_clases" ON alumna_clases
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM auth.users
      WHERE auth.users.id = auth.uid()
        AND (auth.users.raw_app_meta_data ->> 'role') = 'admin'
    )
  );

-- 2. COLUMNAS y soporte para reservas / horarios / academia
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'reservas' AND column_name = 'perfil_id'
  ) THEN
    ALTER TABLE reservas ADD COLUMN perfil_id UUID REFERENCES perfiles(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reservas_perfil ON reservas(perfil_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'reservas' AND column_name = 'origen'
  ) THEN
    ALTER TABLE reservas ADD COLUMN origen VARCHAR(20);
  END IF;
END $$;

UPDATE reservas
SET origen = 'landing'
WHERE horario = 'A coordinar' AND origen IS NULL;

UPDATE reservas
SET origen = 'turnero'
WHERE horario <> 'A coordinar' AND origen IS NULL;

CREATE INDEX IF NOT EXISTS idx_reservas_turnero_slot
  ON reservas(disciplina, fecha, horario, estado);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'horarios' AND column_name = 'cupo_maximo'
  ) THEN
    ALTER TABLE horarios ADD COLUMN cupo_maximo INTEGER DEFAULT 20;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'academia_info' AND column_name = 'cuota_mensual'
  ) THEN
    ALTER TABLE academia_info ADD COLUMN cuota_mensual NUMERIC(10,2) DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'academia_info' AND column_name = 'dias_abiertos'
  ) THEN
    ALTER TABLE academia_info
      ADD COLUMN dias_abiertos TEXT[] DEFAULT ARRAY['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  END IF;
END $$;

UPDATE academia_info
SET dias_abiertos = ARRAY['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
WHERE dias_abiertos IS NULL OR array_length(dias_abiertos, 1) IS NULL;

-- 3. COLUMNAS faltantes en pagos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'pagos' AND column_name = 'alumna_id'
  ) THEN
    ALTER TABLE pagos ADD COLUMN alumna_id UUID REFERENCES perfiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'pagos' AND column_name = 'mes_correspondiente'
  ) THEN
    ALTER TABLE pagos ADD COLUMN mes_correspondiente VARCHAR(50);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'pagos' AND column_name = 'mes'
  ) THEN
    ALTER TABLE pagos ADD COLUMN mes INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'pagos' AND column_name = 'anio'
  ) THEN
    ALTER TABLE pagos ADD COLUMN anio INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'pagos' AND column_name = 'estado'
  ) THEN
    ALTER TABLE pagos ADD COLUMN estado VARCHAR(20) NOT NULL DEFAULT 'pagado';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'pagos' AND column_name = 'nota'
  ) THEN
    ALTER TABLE pagos ADD COLUMN nota TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'pagos' AND column_name = 'mes_periodo'
  ) THEN
    ALTER TABLE pagos ADD COLUMN mes_periodo VARCHAR(7);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pagos_alumna ON pagos(alumna_id);

UPDATE pagos
SET estado = 'pagado'
WHERE estado IS NULL;

UPDATE pagos
SET mes_correspondiente =
  EXTRACT(YEAR FROM fecha_pago)::TEXT || '-' ||
  LPAD(EXTRACT(MONTH FROM fecha_pago)::INT::TEXT, 2, '0')
WHERE mes_correspondiente IS NULL;

UPDATE pagos
SET mes = EXTRACT(MONTH FROM fecha_pago)::INT
WHERE mes IS NULL;

UPDATE pagos
SET anio = EXTRACT(YEAR FROM fecha_pago)::INT
WHERE anio IS NULL;

UPDATE pagos
SET mes_periodo =
  EXTRACT(YEAR FROM fecha_pago)::TEXT || '-' ||
  LPAD(EXTRACT(MONTH FROM fecha_pago)::INT::TEXT, 2, '0')
WHERE mes_periodo IS NULL;

-- 4. TABLA profesores
CREATE TABLE IF NOT EXISTS profesores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL DEFAULT '',
  telefono VARCHAR(50),
  disciplina VARCHAR(100) NOT NULL DEFAULT '',
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profesores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica profesores" ON profesores;
DROP POLICY IF EXISTS "Lectura pÃºblica profesores" ON profesores;
CREATE POLICY "Lectura publica profesores" ON profesores
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admin full access profesores" ON profesores;
CREATE POLICY "Admin full access profesores" ON profesores
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM auth.users
      WHERE auth.users.id = auth.uid()
        AND (auth.users.raw_app_meta_data ->> 'role') = 'admin'
    )
  );

-- 5. TABLA asistencia_profesores
CREATE TABLE IF NOT EXISTS asistencia_profesores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profesor_id UUID NOT NULL REFERENCES profesores(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  presente BOOLEAN NOT NULL DEFAULT FALSE,
  nota TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profesor_id, fecha)
);

CREATE INDEX IF NOT EXISTS idx_asistencia_prof_fecha ON asistencia_profesores(fecha);
CREATE INDEX IF NOT EXISTS idx_asistencia_prof_prof ON asistencia_profesores(profesor_id);

ALTER TABLE asistencia_profesores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica asistencia_profesores" ON asistencia_profesores;
DROP POLICY IF EXISTS "Lectura pÃºblica asistencia_profesores" ON asistencia_profesores;
DROP POLICY IF EXISTS "Lectura privada asistencia_profesores" ON asistencia_profesores;
CREATE POLICY "Lectura privada asistencia_profesores" ON asistencia_profesores
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM auth.users
      WHERE auth.users.id = auth.uid()
        AND (auth.users.raw_app_meta_data ->> 'role') = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin full access asistencia_profesores" ON asistencia_profesores;
CREATE POLICY "Admin full access asistencia_profesores" ON asistencia_profesores
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM auth.users
      WHERE auth.users.id = auth.uid()
        AND (auth.users.raw_app_meta_data ->> 'role') = 'admin'
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'asistencia_profesores' AND column_name = 'presente'
  ) THEN
    ALTER TABLE asistencia_profesores ADD COLUMN presente BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'asistencia_profesores' AND column_name = 'nota'
  ) THEN
    ALTER TABLE asistencia_profesores ADD COLUMN nota TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.asistencia_profesores') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = 'public.asistencia_profesores'::regclass
        AND contype = 'u'
        AND conname = 'asistencia_profesores_profesor_id_fecha_key'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM asistencia_profesores
      GROUP BY profesor_id, fecha
      HAVING COUNT(*) > 1
    ) THEN
    ALTER TABLE asistencia_profesores
      ADD CONSTRAINT asistencia_profesores_profesor_id_fecha_key UNIQUE (profesor_id, fecha);
  END IF;
END $$;

-- 6. FUNCION atomica para crear reservas con control de cupo
CREATE OR REPLACE FUNCTION public.crear_reserva_segura(
  p_nombre TEXT,
  p_apellido TEXT DEFAULT NULL,
  p_telefono TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_disciplina TEXT DEFAULT NULL,
  p_fecha DATE DEFAULT NULL,
  p_horario TEXT DEFAULT NULL,
  p_alumno_nombre TEXT DEFAULT NULL,
  p_alumno_edad INTEGER DEFAULT NULL,
  p_origen TEXT DEFAULT NULL,
  p_perfil_id UUID DEFAULT NULL,
  p_dia TEXT DEFAULT NULL,
  p_validar_horario BOOLEAN DEFAULT TRUE,
  p_estado TEXT DEFAULT 'pendiente'
) RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_reserva_id UUID := gen_random_uuid();
  v_cupo INTEGER := 20;
  v_hora INTEGER;
  v_reservados INTEGER := 0;
  v_horario_id UUID;
  v_estado TEXT := CASE
    WHEN p_estado IN ('pendiente', 'confirmado', 'cancelado', 'completado') THEN p_estado
    ELSE 'pendiente'
  END;
BEGIN
  IF COALESCE(BTRIM(p_nombre), '') = '' OR COALESCE(BTRIM(p_disciplina), '') = '' THEN
    RAISE EXCEPTION 'Completá los datos obligatorios antes de continuar.';
  END IF;

  IF COALESCE(BTRIM(p_horario), '') = '' THEN
    RAISE EXCEPTION 'Seleccioná un horario válido antes de continuar.';
  END IF;

  IF p_validar_horario AND COALESCE(BTRIM(p_horario), '') <> 'A coordinar' THEN
    IF p_fecha IS NULL THEN
      RAISE EXCEPTION 'Seleccioná una fecha para la reserva.';
    END IF;

    IF COALESCE(BTRIM(p_dia), '') = '' THEN
      RAISE EXCEPTION 'No pudimos validar el día del turno.';
    END IF;

    BEGIN
      v_hora := SPLIT_PART(p_horario, ':', 1)::INTEGER;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'El horario seleccionado no es válido.';
    END;

    SELECT h.id, COALESCE(h.cupo_maximo, 20)
    INTO v_horario_id, v_cupo
    FROM horarios h
    JOIN clases c ON c.id = h.clase_id
    WHERE h.dia = p_dia
      AND h.hora = v_hora
      AND c.nombre = p_disciplina
    LIMIT 1;

    IF v_horario_id IS NULL THEN
      RAISE EXCEPTION 'Ese horario ya no está disponible. Elegí otro para continuar.';
    END IF;

    PERFORM pg_advisory_xact_lock(
      hashtext(COALESCE(p_disciplina, '') || '|' || COALESCE(p_fecha::TEXT, '') || '|' || COALESCE(p_horario, ''))
    );

    SELECT COUNT(*)
    INTO v_reservados
    FROM reservas
    WHERE disciplina = p_disciplina
      AND fecha = p_fecha
      AND horario = p_horario
      AND estado IN ('pendiente', 'confirmado');

    IF v_reservados >= v_cupo THEN
      RAISE EXCEPTION 'Ese horario ya se quedó sin cupo. Elegí otro para continuar.';
    END IF;
  END IF;

  IF COALESCE(BTRIM(p_telefono), '') <> '' AND EXISTS (
    SELECT 1
    FROM reservas
    WHERE disciplina = p_disciplina
      AND horario = p_horario
      AND (
        (p_fecha IS NULL AND fecha IS NULL)
        OR fecha = p_fecha
      )
      AND telefono = p_telefono
      AND estado IN ('pendiente', 'confirmado')
  ) THEN
    RAISE EXCEPTION 'Ya existe una reserva activa con ese teléfono para ese horario.';
  END IF;

  INSERT INTO reservas (
    id,
    nombre,
    apellido,
    telefono,
    email,
    disciplina,
    fecha,
    horario,
    alumno_nombre,
    alumno_edad,
    estado,
    origen,
    perfil_id
  )
  VALUES (
    v_reserva_id,
    NULLIF(BTRIM(p_nombre), ''),
    NULLIF(BTRIM(p_apellido), ''),
    NULLIF(BTRIM(p_telefono), ''),
    NULLIF(BTRIM(p_email), ''),
    NULLIF(BTRIM(p_disciplina), ''),
    p_fecha,
    NULLIF(BTRIM(p_horario), ''),
    NULLIF(BTRIM(p_alumno_nombre), ''),
    p_alumno_edad,
    v_estado,
    NULLIF(BTRIM(p_origen), ''),
    p_perfil_id
  );

  RETURN v_reserva_id;
END;
$$;

REVOKE ALL ON FUNCTION public.crear_reserva_segura(
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  DATE,
  TEXT,
  TEXT,
  INTEGER,
  TEXT,
  UUID,
  TEXT,
  BOOLEAN,
  TEXT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.crear_reserva_segura(
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  DATE,
  TEXT,
  TEXT,
  INTEGER,
  TEXT,
  UUID,
  TEXT,
  BOOLEAN,
  TEXT
) TO service_role;

-- 7. Backfill de reservas existentes hacia perfiles por telefono
UPDATE reservas r
SET perfil_id = p.id
FROM perfiles p
WHERE r.perfil_id IS NULL
  AND r.telefono IS NOT NULL
  AND r.telefono <> ''
  AND REGEXP_REPLACE(r.telefono, '\D', '', 'g') = REGEXP_REPLACE(p.telefono, '\D', '', 'g');
