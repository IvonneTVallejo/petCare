-- ============================================================
-- BACKUP COMPLETO - Base de Datos PetCare Bonamur
-- Proyecto Supabase: nlqtzidfowoxylporidi
-- Fecha de generación: 2026
-- ============================================================

-- ============================================================
-- PARTE 1: ESTRUCTURA (DDL) - Tablas de referencia
-- ============================================================

-- Tabla: tipo_documento
CREATE TABLE IF NOT EXISTS tipo_documento (
    td_id_t_documento SERIAL PRIMARY KEY,
    td_t_documento VARCHAR NOT NULL
);

-- Tabla: genero
CREATE TABLE IF NOT EXISTS genero (
    g_id_genero SERIAL PRIMARY KEY,
    g_genero VARCHAR NOT NULL
);

-- Tabla: moneda
CREATE TABLE IF NOT EXISTS moneda (
    m_id_moneda SERIAL PRIMARY KEY,
    m_moneda VARCHAR NOT NULL
);

-- Tabla: vacunas
CREATE TABLE IF NOT EXISTS vacunas (
    v_id_vacuna SERIAL PRIMARY KEY,
    v_nombre_vacuna VARCHAR NOT NULL
);

-- Tabla: estado_consulta
CREATE TABLE IF NOT EXISTS estado_consulta (
    ec_id_estado INTEGER PRIMARY KEY,
    ec_estado_consulta VARCHAR NOT NULL
);

-- ============================================================
-- PARTE 2: ESTRUCTURA (DDL) - Tablas principales
-- ============================================================

-- Tabla: personal_vet
CREATE TABLE IF NOT EXISTS personal_vet (
    pv_documento INTEGER PRIMARY KEY,
    pv_primer_nombre VARCHAR NOT NULL,
    pv_segundo_nombre VARCHAR,
    pv_primer_apellido VARCHAR NOT NULL,
    pv_segundo_apellido VARCHAR,
    pv_td_id_t_documento INTEGER NOT NULL REFERENCES tipo_documento(td_id_t_documento),
    pv_g_id_genero INTEGER NOT NULL REFERENCES genero(g_id_genero),
    pv_email TEXT NOT NULL UNIQUE,
    pv_username TEXT,
    CONSTRAINT personal_vet_pv_documento_key UNIQUE (pv_documento)
);

-- Tabla: info_contacto
CREATE TABLE IF NOT EXISTS info_contacto (
    ic_id_info_contacto SERIAL,
    ic_pv_documento INTEGER NOT NULL REFERENCES personal_vet(pv_documento) ON DELETE CASCADE,
    ic_telefono BIGINT NOT NULL,
    ic_direccion VARCHAR NOT NULL,
    ic_contacto_emer BIGINT NOT NULL,
    ic_contacto_emer_nom VARCHAR NOT NULL,
    PRIMARY KEY (ic_id_info_contacto, ic_pv_documento)
);

-- Tabla: info_laboral
CREATE TABLE IF NOT EXISTS info_laboral (
    il_id_info_laboral SERIAL PRIMARY KEY,
    il_pv_documento INTEGER NOT NULL REFERENCES personal_vet(pv_documento),
    il_cv_id_cargo INTEGER NOT NULL,
    il_salario INTEGER NOT NULL,
    il_m_id_moneda INTEGER NOT NULL REFERENCES moneda(m_id_moneda),
    il_fecha_ingreso DATE NOT NULL,
    il_fecha_retiro DATE
);

-- Tabla: rol_vet
CREATE TABLE IF NOT EXISTS rol_vet (
    rv_id_rol SERIAL PRIMARY KEY,
    rv_rol VARCHAR NOT NULL,
    rv_usuario VARCHAR NOT NULL,
    rv_ultimo_login DATE NOT NULL,
    rv_permisos TEXT NOT NULL,
    rv_estado BOOLEAN NOT NULL,
    rv_pv_documento INTEGER NOT NULL REFERENCES personal_vet(pv_documento)
);

-- Tabla: datos_cliente
CREATE TABLE IF NOT EXISTS datos_cliente (
    dc_id_cliente SERIAL PRIMARY KEY,
    dc_nombre VARCHAR NOT NULL,
    dc_td_id_t_documento INTEGER NOT NULL REFERENCES tipo_documento(td_id_t_documento),
    dc_direccion VARCHAR NOT NULL,
    dc_telefono BIGINT NOT NULL,
    dc_identificacion BIGINT NOT NULL UNIQUE,
    dc_correo VARCHAR
);

-- Tabla: datos_mascota
CREATE TABLE IF NOT EXISTS datos_mascota (
    dm_id_mascota SERIAL PRIMARY KEY,
    dm_dc_id_cliente INTEGER NOT NULL REFERENCES datos_cliente(dc_id_cliente) ON DELETE CASCADE,
    dm_nombre VARCHAR NOT NULL,
    dm_especie VARCHAR NOT NULL,
    dm_raza VARCHAR NOT NULL,
    dm_sexo VARCHAR NOT NULL,
    dm_peso DOUBLE PRECISION NOT NULL,
    dm_fecha_nacimiento DATE,
    dm_esterilizado TEXT DEFAULT 'N'
);

-- Tabla: historial_clinico
CREATE TABLE IF NOT EXISTS historial_clinico (
    hc_id_historial SERIAL PRIMARY KEY,
    hc_dm_id_mascota INTEGER NOT NULL REFERENCES datos_mascota(dm_id_mascota) ON DELETE CASCADE,
    hc_pv_documento INTEGER NOT NULL REFERENCES personal_vet(pv_documento),
    hc_fecha DATE NOT NULL,
    hc_historial TEXT NOT NULL
);

-- Tabla: info_vacunacion
CREATE TABLE IF NOT EXISTS info_vacunacion (
    iv_id_info_vacunas SERIAL PRIMARY KEY,
    iv_v_id_vacuna INTEGER NOT NULL REFERENCES vacunas(v_id_vacuna),
    iv_dm_id_mascota INTEGER NOT NULL REFERENCES datos_mascota(dm_id_mascota),
    iv_fecha_vacunacion DATE NOT NULL
);

-- Tabla: consulta_medica
CREATE TABLE IF NOT EXISTS consulta_medica (
    cm_id_consulta SERIAL PRIMARY KEY,
    cm_dc_id_cliente INTEGER NOT NULL REFERENCES datos_cliente(dc_id_cliente) ON DELETE CASCADE,
    cm_dm_id_mascota INTEGER NOT NULL REFERENCES datos_mascota(dm_id_mascota) ON DELETE CASCADE,
    cm_fecha_consulta DATE NOT NULL,
    cm_motivo_consulta TEXT NOT NULL,
    cm_formula TEXT,
    cm_ec_id_estado INTEGER REFERENCES estado_consulta(ec_id_estado),
    cm_diagnosticos_diferenciales TEXT,
    cm_diagnostico_definitivo TEXT,
    cm_medicamentos_aplicados TEXT,
    cm_presupuesto TEXT,
    cm_observaciones TEXT
);

-- Constraint adicional en consulta_medica
ALTER TABLE consulta_medica
    ADD CONSTRAINT consulta_medica_cm_ec_id_estado_fkey
    FOREIGN KEY (cm_ec_id_estado) REFERENCES estado_consulta(ec_id_estado) ON UPDATE CASCADE;

-- Tabla: examen_fisico
CREATE TABLE IF NOT EXISTS examen_fisico (
    ef_id_examen_fisico SERIAL PRIMARY KEY,
    ef_peso_mascota INTEGER NOT NULL,
    ef_fr TEXT,
    ef_fc TEXT,
    ef_pulso TEXT,
    ef_tllc TEXT,
    ef_deshidratacion TEXT,
    ef_trufa TEXT,
    ef_turgencia_piel TEXT,
    ef_temperatura TEXT,
    ef_reflejo_pupilar TEXT,
    ef_palp_abdominal TEXT,
    ef_estado_conciencia TEXT,
    ef_apariencia_general TEXT,
    ef_color_mucosas TEXT,
    ef_boca_dientes TEXT,
    ef_ojos TEXT,
    ef_oidos TEXT,
    ef_piel_pelo TEXT,
    ef_sonidos_cardiacos TEXT,
    ef_musculo_esqueletico TEXT,
    ef_otros TEXT,
    ef_cm_id_consulta INTEGER REFERENCES consulta_medica(cm_id_consulta)
);

-- Tabla: ectoparasitos
CREATE TABLE IF NOT EXISTS ectoparasitos (
    e_id_ectoparasitos SERIAL PRIMARY KEY,
    e_pulgas TEXT,
    e_garrapatas TEXT,
    e_pruito TEXT,
    e_descripcion_pulgas TEXT,
    e_descripcion_garrapatas TEXT,
    e_descripcion_pruito TEXT,
    e_copro_directo TEXT,
    e_copro_flotacion TEXT,
    e_cm_id_consulta INTEGER REFERENCES consulta_medica(cm_id_consulta)
);

-- Tabla: plan_diagnostico
CREATE TABLE IF NOT EXISTS plan_diagnostico (
    pd_id_plan_diagnostico SERIAL PRIMARY KEY,
    pd_raspado TEXT,
    pd_citologia TEXT,
    pd_rx_contraste TEXT,
    pd_perfil_renal TEXT,
    pd_quimica_sanguinea TEXT,
    pd_perfil_preanestesico TEXT,
    pd_perfil_hepatico TEXT,
    pd_snap TEXT,
    pd_radiografia TEXT,
    pd_endoscopia TEXT,
    pd_hospitalizacion TEXT,
    pd_sedacion TEXT,
    pd_anestesia TEXT,
    pd_suturas TEXT,
    pd_observacion TEXT,
    pd_interconsulta TEXT,
    pd_cm_id_consulta INTEGER REFERENCES consulta_medica(cm_id_consulta)
);

-- Tabla: seguimiento
CREATE TABLE IF NOT EXISTS seguimiento (
    s_id_seguimiento INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    s_cm_id_consulta INTEGER NOT NULL REFERENCES consulta_medica(cm_id_consulta) ON DELETE CASCADE,
    s_seguimiento TEXT NOT NULL,
    s_formula TEXT
);


-- ============================================================
-- PARTE 3: DATOS (DML) - Tablas de referencia
-- ============================================================

-- tipo_documento
INSERT INTO tipo_documento (td_id_t_documento, td_t_documento) VALUES
    (1, 'Cédula de Ciudadanía'),
    (2, 'Cedula de Extranjería'),
    (3, 'Pasaporte'),
    (4, 'Permiso por Protección Temporal (PPT)'),
    (5, 'NIT')
ON CONFLICT (td_id_t_documento) DO NOTHING;

-- genero
INSERT INTO genero (g_id_genero, g_genero) VALUES
    (1, 'Femenino'),
    (2, 'Masculino'),
    (3, 'No informa')
ON CONFLICT (g_id_genero) DO NOTHING;

-- moneda
INSERT INTO moneda (m_id_moneda, m_moneda) VALUES
    (1, 'Pesos Colombianos')
ON CONFLICT (m_id_moneda) DO NOTHING;

-- estado_consulta
INSERT INTO estado_consulta (ec_id_estado, ec_estado_consulta) VALUES
    (1, 'Abierta'),
    (2, 'Finalizada')
ON CONFLICT (ec_id_estado) DO NOTHING;

-- ============================================================
-- PARTE 4: DATOS (DML) - Tablas principales
-- ============================================================

-- personal_vet
INSERT INTO personal_vet (pv_documento, pv_primer_nombre, pv_segundo_nombre, pv_primer_apellido, pv_segundo_apellido, pv_td_id_t_documento, pv_g_id_genero, pv_email, pv_username) VALUES
    (1030598618, 'Ivonne', 'Tatiana', 'Vallejo', 'Sotelo', 1, 1, 'tatiana@gmail.com', NULL),
    (52936566, 'Sandra', NULL, 'Sanchez', NULL, 1, 1, 'bonamur.veterinaria2022@hotmail.com', 'bonamur')
ON CONFLICT (pv_documento) DO NOTHING;

-- datos_cliente
INSERT INTO datos_cliente (dc_id_cliente, dc_nombre, dc_td_id_t_documento, dc_direccion, dc_telefono, dc_identificacion, dc_correo) VALUES
    (1, 'John Alexander Moreno Garzon', 1, 'KR 77N # 55 - 15 SUR APTO 101', 3222000243, 1032396291, 'johnmorenog291@gmail.com'),
    (2, 'Tatiana Vallejo', 1, 'KR 77N # 55 - 15 SUR APTO 101', 3186009265, 1030598618, 'tatianav1909@gmail.com'),
    (3, 'martha pachon', 1, 'cra 52 a # 39 b 04 s', 3202513101, 20407492, 'mart.pachon@gmail.com')
ON CONFLICT (dc_id_cliente) DO NOTHING;

-- datos_mascota
INSERT INTO datos_mascota (dm_id_mascota, dm_dc_id_cliente, dm_nombre, dm_especie, dm_raza, dm_sexo, dm_peso, dm_fecha_nacimiento, dm_esterilizado) VALUES
    (1, 1, 'Morgan', 'Felina', 'Criollo', 'Macho', 4.5, '2021-10-15', 'S'),
    (2, 1, 'Pandora', 'Felina', 'Criolla', 'Hembra', 2, '2025-06-13', 'N'),
    (3, 2, 'Nala', 'Felina', '', 'Hembra', 4.5, '2020-05-18', 'S'),
    (4, 3, 'nico', 'Canina', 'poodle', 'Macho', 6, '2010-12-22', 'S')
ON CONFLICT (dm_id_mascota) DO NOTHING;

-- consulta_medica
INSERT INTO consulta_medica (cm_id_consulta, cm_dc_id_cliente, cm_dm_id_mascota, cm_fecha_consulta, cm_motivo_consulta, cm_formula, cm_ec_id_estado, cm_diagnosticos_diferenciales, cm_diagnostico_definitivo, cm_medicamentos_aplicados, cm_presupuesto, cm_observaciones) VALUES
    (1, 1, 1, '2026-03-14', 'diarrea', NULL, 1, 'tiene diarrea', 'colitis', 'diarreol', '', 'se envian examenes'),
    (2, 1, 2, '2026-03-18', 'prueba', NULL, 1, 'prueba', '', 'diarreol', '', 'niguna'),
    (3, 1, 2, '2026-03-17', 'prueba fecha', NULL, 1, '', '', '', '', 'prueba'),
    (4, 3, 4, '2026-04-06', 'camina cojo', NULL, 2, 'ruptura del ligamento cruzaso anterior', 'ruptura del liga,mto cruzado anterior', 'ketoprofeno ', '', 'prueba de cajon positiva'),
    (5, 1, 1, '2026-04-10', 'El paciente ingresa con diarrea ', NULL, 1, 'niguno', 'ninguno', 'ninguno', '', 'tutor reporta desaliento'),
    (6, 1, 1, '2026-04-11', 'rrrr', NULL, 1, 'rrr', 'rrr', 'rr', '2222', 'rrrr'),
    (7, 1, 1, '2026-04-11', 'rrrr', NULL, 1, 'rrr', 'rrr', 'rr', '2222', 'rrrr')
ON CONFLICT (cm_id_consulta) DO NOTHING;

-- examen_fisico
INSERT INTO examen_fisico (ef_id_examen_fisico, ef_peso_mascota, ef_fr, ef_fc, ef_pulso, ef_tllc, ef_deshidratacion, ef_trufa, ef_turgencia_piel, ef_temperatura, ef_reflejo_pupilar, ef_palp_abdominal, ef_estado_conciencia, ef_apariencia_general, ef_color_mucosas, ef_boca_dientes, ef_ojos, ef_oidos, ef_piel_pelo, ef_sonidos_cardiacos, ef_musculo_esqueletico, ef_otros, ef_cm_id_consulta) VALUES
    (1, 4, 'si', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'estable', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'normal', NULL, NULL, NULL, 1),
    (2, 3, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2),
    (3, 4, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 3),
    (4, 6, '30 res/min', '110 lat/min', 'fuerte', '2seg', 'no aplica', 'nariz reseca', '2 seg', '38', 'scpa', 'scpa', 'alerta', 'normal', 'rosadas', 'enfermedad perodontal 6', 'catarata bilateral', 'scpa', 'scpa', '  soplo cardiaco', 'artrosis ', 'scpa', 4),
    (5, 5, NULL, '45', NULL, NULL, NULL, NULL, NULL, '69', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'normales', NULL, NULL, 5),
    (6, 5, 'rr', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 6),
    (7, 5, 'rr', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 7)
ON CONFLICT (ef_id_examen_fisico) DO NOTHING;

-- ectoparasitos
INSERT INTO ectoparasitos (e_id_ectoparasitos, e_pulgas, e_garrapatas, e_pruito, e_descripcion_pulgas, e_descripcion_garrapatas, e_descripcion_pruito, e_copro_directo, e_copro_flotacion, e_cm_id_consulta) VALUES
    (1, 'N', 'N', 'N', NULL, NULL, NULL, NULL, NULL, 1),
    (2, 'N', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2),
    (3, 'N', 'N', 'N', NULL, NULL, NULL, NULL, NULL, 3),
    (4, 'N', 'N', 'N', NULL, NULL, NULL, NULL, NULL, 4),
    (5, 'N', 'N', 'N', NULL, NULL, NULL, NULL, NULL, 5),
    (6, 'S', 'S', 'S', 'rrrr', 'rrrr', 'rrr', NULL, NULL, 6),
    (7, 'S', 'S', 'N', 'rrrr', 'rrrr', NULL, 'N', 'N', 7)
ON CONFLICT (e_id_ectoparasitos) DO NOTHING;

-- plan_diagnostico
INSERT INTO plan_diagnostico (pd_id_plan_diagnostico, pd_raspado, pd_citologia, pd_rx_contraste, pd_perfil_renal, pd_quimica_sanguinea, pd_perfil_preanestesico, pd_perfil_hepatico, pd_snap, pd_radiografia, pd_endoscopia, pd_hospitalizacion, pd_sedacion, pd_anestesia, pd_suturas, pd_observacion, pd_interconsulta, pd_cm_id_consulta) VALUES
    (1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'S', NULL, NULL, NULL, NULL, NULL, 1),
    (2, NULL, NULL, NULL, 'S', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'S', NULL, 'S', 2),
    (3, NULL, NULL, NULL, 'N', NULL, 'N', 'N', NULL, NULL, NULL, NULL, 'S', NULL, NULL, 'S', NULL, 3),
    (4, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'S', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4),
    (5, NULL, NULL, NULL, NULL, 'S', NULL, NULL, NULL, 'S', NULL, 'S', NULL, NULL, NULL, NULL, NULL, 5),
    (6, 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 6),
    (7, 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 7)
ON CONFLICT (pd_id_plan_diagnostico) DO NOTHING;

-- ============================================================
-- PARTE 5: Resetear secuencias
-- ============================================================

SELECT setval('tipo_documento_td_id_t_documento_seq', (SELECT COALESCE(MAX(td_id_t_documento), 0) FROM tipo_documento));
SELECT setval('genero_g_id_genero_seq', (SELECT COALESCE(MAX(g_id_genero), 0) FROM genero));
SELECT setval('moneda_m_id_moneda_seq', (SELECT COALESCE(MAX(m_id_moneda), 0) FROM moneda));
SELECT setval('vacunas_v_id_vacuna_seq', (SELECT COALESCE(MAX(v_id_vacuna), 0) FROM vacunas));
SELECT setval('datos_cliente_dc_id_cliente_seq', (SELECT COALESCE(MAX(dc_id_cliente), 0) FROM datos_cliente));
SELECT setval('datos_mascota_dm_id_mascota_seq', (SELECT COALESCE(MAX(dm_id_mascota), 0) FROM datos_mascota));
SELECT setval('consulta_medica_cm_id_consulta_seq', (SELECT COALESCE(MAX(cm_id_consulta), 0) FROM consulta_medica));
SELECT setval('examen_fisico_ef_id_examen_fisico_seq', (SELECT COALESCE(MAX(ef_id_examen_fisico), 0) FROM examen_fisico));
SELECT setval('ectoparasitos_e_id_ectoparasitos_seq', (SELECT COALESCE(MAX(e_id_ectoparasitos), 0) FROM ectoparasitos));
SELECT setval('plan_diagnostico_pd_id_plan_diagnostico_seq', (SELECT COALESCE(MAX(pd_id_plan_diagnostico), 0) FROM plan_diagnostico));
SELECT setval('historial_clinico_hc_id_historial_seq', (SELECT COALESCE(MAX(hc_id_historial), 0) FROM historial_clinico));
SELECT setval('info_contacto_ic_id_info_contacto_seq', (SELECT COALESCE(MAX(ic_id_info_contacto), 0) FROM info_contacto));
SELECT setval('info_laboral_il_id_info_laboral_seq', (SELECT COALESCE(MAX(il_id_info_laboral), 0) FROM info_laboral));
SELECT setval('info_vacunacion_iv_id_info_vacunas_seq', (SELECT COALESCE(MAX(iv_id_info_vacunas), 0) FROM info_vacunacion));
SELECT setval('rol_vet_rv_id_rol_seq', (SELECT COALESCE(MAX(rv_id_rol), 0) FROM rol_vet));

-- ============================================================
-- FIN DEL BACKUP
-- ============================================================
