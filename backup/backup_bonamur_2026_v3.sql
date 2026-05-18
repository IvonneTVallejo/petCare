-- ============================================================
-- BACKUP COMPLETO - Base de Datos PetCare Bonamur v3
-- Proyecto Supabase: nlqtzidfowoxylporidi
-- Fecha de generación: 2026-05-08
-- Total de tablas: 38
-- ============================================================

-- ============================================================
-- PARTE 1: ESTRUCTURA (DDL) - Tablas de referencia / catálogos
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

-- Tabla: categoria_producto
CREATE TABLE IF NOT EXISTS categoria_producto (
    cat_id_categoria SERIAL PRIMARY KEY,
    cat_nombre VARCHAR NOT NULL UNIQUE
);

-- Tabla: estado_orden_compra
CREATE TABLE IF NOT EXISTS estado_orden_compra (
    eoc_id_estado SERIAL PRIMARY KEY,
    eoc_estado VARCHAR NOT NULL UNIQUE
);

-- Tabla: tipo_movimiento_inventario
CREATE TABLE IF NOT EXISTS tipo_movimiento_inventario (
    tmi_id_tipo SERIAL PRIMARY KEY,
    tmi_tipo VARCHAR NOT NULL UNIQUE
);

-- Tabla: estado_cita
CREATE TABLE IF NOT EXISTS estado_cita (
    eci_id_estado_cita INTEGER PRIMARY KEY,
    eci_estado VARCHAR NOT NULL UNIQUE,
    eci_color VARCHAR NOT NULL
);

-- Tabla: roles
CREATE TABLE IF NOT EXISTS roles (
    rl_id_rol SERIAL PRIMARY KEY,
    rl_nombre VARCHAR NOT NULL UNIQUE,
    rl_descripcion TEXT
);

-- Tabla: modulos
CREATE TABLE IF NOT EXISTS modulos (
    md_id_modulo SERIAL PRIMARY KEY,
    md_nombre VARCHAR NOT NULL UNIQUE,
    md_ruta VARCHAR NOT NULL
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
    il_cv_id_cargo INTEGER NOT NULL REFERENCES roles(rl_id_rol),
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
    s_formula TEXT,
    s_fecha_seguimiento DATE NOT NULL
);

-- ============================================================
-- PARTE 2B: ESTRUCTURA (DDL) - Tablas de Inventario
-- ============================================================

-- Tabla: proveedores
CREATE TABLE IF NOT EXISTS proveedores (
    prov_id_proveedor SERIAL PRIMARY KEY,
    prov_nombre VARCHAR NOT NULL,
    prov_nit VARCHAR NOT NULL UNIQUE,
    prov_telefono BIGINT NOT NULL,
    prov_correo VARCHAR NOT NULL,
    prov_direccion VARCHAR NOT NULL,
    prov_contacto VARCHAR,
    prov_condiciones_comerciales TEXT,
    prov_notas TEXT
);

-- Tabla: productos
CREATE TABLE IF NOT EXISTS productos (
    pr_id_producto SERIAL PRIMARY KEY,
    pr_nombre VARCHAR NOT NULL,
    pr_descripcion TEXT NOT NULL,
    pr_cat_id_categoria INTEGER NOT NULL REFERENCES categoria_producto(cat_id_categoria),
    pr_prov_id_proveedor INTEGER NOT NULL REFERENCES proveedores(prov_id_proveedor),
    pr_costo_compra DOUBLE PRECISION NOT NULL,
    pr_precio_venta DOUBLE PRECISION NOT NULL,
    pr_cantidad_disponible INTEGER NOT NULL DEFAULT 0,
    pr_stock_minimo INTEGER NOT NULL,
    pr_lote VARCHAR NOT NULL,
    pr_fecha_vencimiento DATE
);

-- Tabla: ordenes_compra
CREATE TABLE IF NOT EXISTS ordenes_compra (
    oc_id_orden SERIAL PRIMARY KEY,
    oc_prov_id_proveedor INTEGER NOT NULL REFERENCES proveedores(prov_id_proveedor),
    oc_numero_orden INTEGER NOT NULL UNIQUE,
    oc_fecha_creacion DATE NOT NULL DEFAULT CURRENT_DATE,
    oc_total DOUBLE PRECISION NOT NULL DEFAULT 0,
    oc_eoc_id_estado INTEGER NOT NULL DEFAULT 1 REFERENCES estado_orden_compra(eoc_id_estado)
);

-- Tabla: detalle_orden_compra
CREATE TABLE IF NOT EXISTS detalle_orden_compra (
    doc_id_detalle SERIAL PRIMARY KEY,
    doc_oc_id_orden INTEGER NOT NULL REFERENCES ordenes_compra(oc_id_orden),
    doc_pr_id_producto INTEGER NOT NULL REFERENCES productos(pr_id_producto),
    doc_cantidad INTEGER NOT NULL,
    doc_costo_unitario DOUBLE PRECISION NOT NULL,
    doc_subtotal DOUBLE PRECISION NOT NULL,
    doc_cantidad_recibida INTEGER NOT NULL DEFAULT 0
);

-- Tabla: recepcion_compra
CREATE TABLE IF NOT EXISTS recepcion_compra (
    rc_id_recepcion SERIAL PRIMARY KEY,
    rc_oc_id_orden INTEGER NOT NULL REFERENCES ordenes_compra(oc_id_orden),
    rc_fecha_recepcion DATE NOT NULL DEFAULT CURRENT_DATE,
    rc_numero_factura VARCHAR,
    rc_notas TEXT
);

-- Tabla: facturas_compra
CREATE TABLE IF NOT EXISTS facturas_compra (
    fc_id_factura SERIAL PRIMARY KEY,
    fc_numero_factura VARCHAR NOT NULL,
    fc_fecha_factura DATE NOT NULL,
    fc_oc_id_orden INTEGER NOT NULL REFERENCES ordenes_compra(oc_id_orden),
    fc_prov_id_proveedor INTEGER NOT NULL REFERENCES proveedores(prov_id_proveedor),
    fc_monto_total DOUBLE PRECISION NOT NULL,
    fc_estado_pago VARCHAR NOT NULL DEFAULT 'pendiente'
);

-- Tabla: ventas
CREATE TABLE IF NOT EXISTS ventas (
    vt_id_venta SERIAL PRIMARY KEY,
    vt_numero_venta INTEGER NOT NULL UNIQUE,
    vt_fecha_venta DATE NOT NULL DEFAULT CURRENT_DATE,
    vt_dc_id_cliente INTEGER REFERENCES datos_cliente(dc_id_cliente),
    vt_total DOUBLE PRECISION NOT NULL DEFAULT 0,
    vt_nombre_cliente VARCHAR NOT NULL DEFAULT 'Consumidor Final'
);

-- Tabla: detalle_venta
CREATE TABLE IF NOT EXISTS detalle_venta (
    dv_id_detalle SERIAL PRIMARY KEY,
    dv_vt_id_venta INTEGER NOT NULL REFERENCES ventas(vt_id_venta),
    dv_pr_id_producto INTEGER NOT NULL REFERENCES productos(pr_id_producto),
    dv_cantidad INTEGER NOT NULL,
    dv_precio_unitario DOUBLE PRECISION NOT NULL,
    dv_costo_unitario DOUBLE PRECISION NOT NULL,
    dv_subtotal DOUBLE PRECISION NOT NULL
);

-- Tabla: movimientos_inventario
CREATE TABLE IF NOT EXISTS movimientos_inventario (
    mi_id_movimiento SERIAL PRIMARY KEY,
    mi_pr_id_producto INTEGER NOT NULL REFERENCES productos(pr_id_producto),
    mi_tmi_id_tipo INTEGER NOT NULL REFERENCES tipo_movimiento_inventario(tmi_id_tipo),
    mi_fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    mi_cantidad INTEGER NOT NULL,
    mi_costo_unitario DOUBLE PRECISION NOT NULL,
    mi_saldo_resultante INTEGER NOT NULL,
    mi_referencia_orden INTEGER REFERENCES ordenes_compra(oc_id_orden),
    mi_referencia_venta INTEGER REFERENCES ventas(vt_id_venta),
    mi_notas TEXT
);

-- ============================================================
-- PARTE 2C: ESTRUCTURA (DDL) - Tablas de Agenda
-- ============================================================

-- Tabla: tipo_cita
CREATE TABLE IF NOT EXISTS tipo_cita (
    tc_id_tipo_cita SERIAL PRIMARY KEY,
    tc_nombre VARCHAR NOT NULL UNIQUE,
    tc_duracion_minutos INTEGER NOT NULL CHECK (tc_duracion_minutos >= 15 AND tc_duracion_minutos <= 480),
    tc_precio DOUBLE PRECISION NOT NULL DEFAULT 0,
    tc_color VARCHAR NOT NULL DEFAULT '#007bff',
    tc_pv_documento INTEGER REFERENCES personal_vet(pv_documento)
);

-- Tabla: citas
CREATE TABLE IF NOT EXISTS citas (
    ct_id_cita SERIAL PRIMARY KEY,
    ct_dc_id_cliente INTEGER NOT NULL REFERENCES datos_cliente(dc_id_cliente),
    ct_dm_id_mascota INTEGER NOT NULL REFERENCES datos_mascota(dm_id_mascota),
    ct_tc_id_tipo_cita INTEGER NOT NULL REFERENCES tipo_cita(tc_id_tipo_cita),
    ct_pv_documento INTEGER NOT NULL REFERENCES personal_vet(pv_documento),
    ct_eci_id_estado_cita INTEGER NOT NULL DEFAULT 1 REFERENCES estado_cita(eci_id_estado_cita),
    ct_fecha DATE NOT NULL,
    ct_hora_inicio TIME NOT NULL,
    ct_hora_fin TIME NOT NULL,
    ct_notas TEXT,
    ct_cm_id_consulta INTEGER REFERENCES consulta_medica(cm_id_consulta),
    ct_fecha_creacion TIMESTAMP NOT NULL DEFAULT now(),
    ct_fecha_original DATE,
    ct_hora_original TIME
);

-- Tabla: horario_veterinario
CREATE TABLE IF NOT EXISTS horario_veterinario (
    hv_id_horario SERIAL PRIMARY KEY,
    hv_pv_documento INTEGER NOT NULL REFERENCES personal_vet(pv_documento),
    hv_dia_semana INTEGER NOT NULL CHECK (hv_dia_semana >= 0 AND hv_dia_semana <= 6),
    hv_hora_inicio TIME NOT NULL,
    hv_hora_fin TIME NOT NULL,
    hv_buffer_minutos INTEGER NOT NULL DEFAULT 0 CHECK (hv_buffer_minutos >= 0 AND hv_buffer_minutos <= 60)
);

-- Tabla: bloqueo_horario
CREATE TABLE IF NOT EXISTS bloqueo_horario (
    bh_id_bloqueo SERIAL PRIMARY KEY,
    bh_pv_documento INTEGER REFERENCES personal_vet(pv_documento),
    bh_fecha DATE NOT NULL,
    bh_hora_inicio TIME NOT NULL,
    bh_hora_fin TIME NOT NULL,
    bh_motivo TEXT NOT NULL
);

-- Tabla: dia_no_laboral
CREATE TABLE IF NOT EXISTS dia_no_laboral (
    dnl_id_dia SERIAL PRIMARY KEY,
    dnl_fecha DATE NOT NULL UNIQUE,
    dnl_descripcion VARCHAR NOT NULL
);

-- ============================================================
-- PARTE 2D: ESTRUCTURA (DDL) - Tablas de Roles/Permisos
-- ============================================================

-- (roles y modulos ya definidos en PARTE 1 como catálogos)

-- Tabla: permisos
CREATE TABLE IF NOT EXISTS permisos (
    pm_id_permiso SERIAL PRIMARY KEY,
    pm_rl_id_rol INTEGER NOT NULL REFERENCES roles(rl_id_rol),
    pm_md_id_modulo INTEGER NOT NULL REFERENCES modulos(md_id_modulo)
);

-- ============================================================
-- PARTE 2E: ESTRUCTURA (DDL) - Tabla de Adjuntos
-- ============================================================

-- Tabla: adjuntos
CREATE TABLE IF NOT EXISTS adjuntos (
    a_id_adjunto SERIAL PRIMARY KEY,
    a_s_id_seguimiento INTEGER NOT NULL REFERENCES seguimiento(s_id_seguimiento),
    a_nombre_archivo VARCHAR NOT NULL,
    a_tipo_archivo VARCHAR NOT NULL,
    a_base64 TEXT NOT NULL,
    a_fecha_registro TIMESTAMP DEFAULT now()
);


-- ============================================================
-- PARTE 3: DATOS (DML) - Tablas de referencia / catálogos
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

-- categoria_producto
INSERT INTO categoria_producto (cat_id_categoria, cat_nombre) VALUES
    (1, 'Medicamentos'),
    (2, 'Alimentos'),
    (3, 'Accesorios'),
    (4, 'Vacunas'),
    (5, 'Insumos Médicos')
ON CONFLICT (cat_id_categoria) DO NOTHING;

-- estado_orden_compra
INSERT INTO estado_orden_compra (eoc_id_estado, eoc_estado) VALUES
    (1, 'pendiente'),
    (2, 'recibida_parcial'),
    (3, 'recibida_completa'),
    (4, 'cancelada')
ON CONFLICT (eoc_id_estado) DO NOTHING;

-- tipo_movimiento_inventario
INSERT INTO tipo_movimiento_inventario (tmi_id_tipo, tmi_tipo) VALUES
    (1, 'entrada_compra'),
    (2, 'salida_venta'),
    (3, 'ajuste_positivo'),
    (4, 'ajuste_negativo')
ON CONFLICT (tmi_id_tipo) DO NOTHING;

-- estado_cita
INSERT INTO estado_cita (eci_id_estado_cita, eci_estado, eci_color) VALUES
    (1, 'Programada', '#007bff'),
    (2, 'Finalizada', '#28a745'),
    (3, 'Cancelada', '#dc3545'),
    (4, 'No asistió', '#fd7e14')
ON CONFLICT (eci_id_estado_cita) DO NOTHING;

-- roles
INSERT INTO roles (rl_id_rol, rl_nombre, rl_descripcion) VALUES
    (1, 'Médico veterinario', 'Profesional veterinario titulado'),
    (2, 'Veterinario jefe', 'Veterinario con funciones administrativas'),
    (3, 'Auxiliar veterinario', 'Personal de apoyo clínico'),
    (4, 'Practicante veterinario', 'Estudiante en práctica'),
    (5, 'Groomer', 'Especialista en estética animal'),
    (6, 'Administrador', 'Acceso total al sistema'),
    (7, 'Cirujano', 'Profecional cirujano')
ON CONFLICT (rl_id_rol) DO NOTHING;

-- modulos
INSERT INTO modulos (md_id_modulo, md_nombre, md_ruta) VALUES
    (1, 'Inicio', 'home.html'),
    (2, 'Pacientes', 'pacientes.html'),
    (3, 'Agenda', 'agenda.html'),
    (4, 'Inventario', 'inventario.html'),
    (5, 'Proveedores', 'proveedores.html'),
    (6, 'Compras', 'compras.html'),
    (7, 'Ventas', 'ventas.html'),
    (8, 'Reportes', 'reportes.html'),
    (9, 'Usuarios', 'usuarios.html')
ON CONFLICT (md_id_modulo) DO NOTHING;

-- ============================================================
-- PARTE 4: DATOS (DML) - Tablas principales
-- ============================================================

-- personal_vet (5 rows)
INSERT INTO personal_vet (pv_documento, pv_primer_nombre, pv_segundo_nombre, pv_primer_apellido, pv_segundo_apellido, pv_td_id_t_documento, pv_g_id_genero, pv_email, pv_username) VALUES
    (15874569, 'Martha', NULL, 'Pachon', NULL, 1, 1, 'martha@prueba.com', 'martha'),
    (52936566, 'Sandra', NULL, 'Sanchez', NULL, 1, 1, 'bonamur.veterinaria2022@hotmail.com', 'bonamur'),
    (100000254, 'otra', NULL, 'prueba', NULL, 1, 1, 'otra@prueba.com', 'otraprueba'),
    (1030598618, 'Ivonne', 'Tatiana', 'Vallejo', 'Sotelo', 1, 1, 'itvalejos@gmail.com', 'Ivonneta'),
    (1032386291, 'John', 'Alexander', 'Moreno', 'Garzon', 1, 2, 'srcaballero144@gmail.com', 'johnmoreno')
ON CONFLICT (pv_documento) DO NOTHING;

-- info_contacto (5 rows)
INSERT INTO info_contacto (ic_id_info_contacto, ic_pv_documento, ic_telefono, ic_direccion, ic_contacto_emer, ic_contacto_emer_nom) VALUES
    (1, 1032386291, 3222000243, 'Carrera 77N # 55-15 sur, apto 101', 0, 'N/A'),
    (2, 1030598618, 3186009265, 'crr77N #55-15 sur', 0, 'N/A'),
    (6, 100000254, 1254652, 'sdcasdf', 0, 'N/A'),
    (7, 15874569, 45621, 'kjbkdj', 0, 'N/A'),
    (8, 52936566, 4562132, '3213f2132', 0, 'N/A')
ON CONFLICT (ic_id_info_contacto, ic_pv_documento) DO NOTHING;

-- info_laboral (5 rows)
INSERT INTO info_laboral (il_id_info_laboral, il_pv_documento, il_cv_id_cargo, il_salario, il_m_id_moneda, il_fecha_ingreso, il_fecha_retiro) VALUES
    (1, 52936566, 2, 0, 1, '2026-01-01', NULL),
    (2, 1032386291, 6, 0, 1, '2026-05-07', NULL),
    (3, 1030598618, 6, 0, 1, '2026-05-07', NULL),
    (6, 100000254, 5, 0, 1, '2026-05-07', NULL),
    (7, 15874569, 3, 0, 1, '2026-05-07', NULL)
ON CONFLICT (il_id_info_laboral) DO NOTHING;

-- rol_vet (5 rows)
INSERT INTO rol_vet (rv_id_rol, rv_rol, rv_usuario, rv_ultimo_login, rv_permisos, rv_estado, rv_pv_documento) VALUES
    (1, 'Veterinario jefe', 'bonamur', '2026-05-06', '', true, 52936566),
    (2, 'Administrador', 'johnmoreno', '2026-05-07', '', true, 1032386291),
    (3, 'Administrador', 'Ivonneta', '2026-05-07', '', true, 1030598618),
    (6, 'Groomer', 'otraprueba', '2026-05-07', '', true, 100000254),
    (7, 'Auxiliar veterinario', 'martha', '2026-05-07', '', true, 15874569)
ON CONFLICT (rv_id_rol) DO NOTHING;

-- datos_cliente (3 rows)
INSERT INTO datos_cliente (dc_id_cliente, dc_nombre, dc_td_id_t_documento, dc_direccion, dc_telefono, dc_identificacion, dc_correo) VALUES
    (1, 'John Alexander Moreno Garzon', 1, 'KR 77N # 55 - 15 SUR APTO 101', 3222000243, 1032396291, 'johnmorenog291@hotmail.com'),
    (2, 'Tatiana Vallejo', 1, 'KR 77N # 55 - 15 SUR APTO 101', 3186009265, 1030598618, 'tatianav1909@gmail.com'),
    (3, 'martha pachon', 1, 'cra 52 a # 39 b 04 s', 3202513101, 20407492, 'mart.pachon@gmail.com')
ON CONFLICT (dc_id_cliente) DO NOTHING;

-- datos_mascota (4 rows)
INSERT INTO datos_mascota (dm_id_mascota, dm_dc_id_cliente, dm_nombre, dm_especie, dm_raza, dm_sexo, dm_peso, dm_fecha_nacimiento, dm_esterilizado) VALUES
    (1, 1, 'Morgan', 'Felina', 'Criollo', 'Macho', 4.5, '2021-10-15', 'S'),
    (2, 1, 'Pandora', 'Felina', 'Criolla', 'Hembra', 2, '2025-06-13', 'N'),
    (3, 2, 'Nala', 'Felina', '', 'Hembra', 4.5, '2020-05-18', 'S'),
    (4, 3, 'nico', 'Canina', 'poodle', 'Macho', 6, '2010-12-22', 'S')
ON CONFLICT (dm_id_mascota) DO NOTHING;

-- consulta_medica (12 rows)
INSERT INTO consulta_medica (cm_id_consulta, cm_dc_id_cliente, cm_dm_id_mascota, cm_fecha_consulta, cm_motivo_consulta, cm_formula, cm_ec_id_estado, cm_diagnosticos_diferenciales, cm_diagnostico_definitivo, cm_medicamentos_aplicados, cm_presupuesto, cm_observaciones) VALUES
    (1, 1, 1, '2026-03-14', 'diarrea', 'prueba de formula', 2, 'tiene diarrea', 'colitis', 'diarreol', '', 'se envian examenes'),
    (2, 1, 2, '2026-03-18', 'prueba', NULL, 1, 'prueba', '', 'diarreol', '', 'niguna'),
    (3, 1, 2, '2026-03-17', 'prueba fecha', NULL, 1, '', '', '', '', 'prueba'),
    (4, 3, 4, '2026-04-06', 'camina cojo', NULL, 2, 'ruptura del ligamento cruzaso anterior', 'ruptura del liga,mto cruzado anterior', 'ketoprofeno ', '', 'prueba de cajon positiva'),
    (5, 1, 1, '2026-04-10', 'El paciente ingresa con diarrea ', NULL, 1, 'niguno', 'ninguno', 'ninguno', '', 'tutor reporta desaliento'),
    (6, 1, 1, '2026-04-11', 'rrrr', NULL, 1, 'rrr', 'rrr', 'rr', '2222', 'rrrr'),
    (7, 1, 1, '2026-04-11', 'rrrr', NULL, 1, 'rrr', 'rrr', 'rr', '2222', 'rrrr'),
    (8, 3, 4, '2026-05-01', 'Cita: Consulta de seguimiento', NULL, 1, NULL, NULL, NULL, NULL, NULL),
    (9, 1, 1, '2026-05-05', 'prueba', NULL, 1, '', '', '', '', ''),
    (10, 1, 1, '2026-05-05', 'POR QUE SI', NULL, 1, '', '', '[{"nombre":"Enrofloxacina","lote":"5458787","cantidad":10}]', '', ''),
    (11, 1, 1, '2026-05-07', 'prueba inicail', NULL, 1, '', '', '[{"nombre":"Enrofloxacina","lote":"5458787","cantidad":1}]', '', 'esta muy bien'),
    (12, 1, 1, '2026-05-07', 'prueba', 'jnñdfjvbñskdfjvañldjkfvñladfknv', 1, 'prueba', 'prueba', '[{"nombre":"Enrofloxacina","lote":"5458787","cantidad":1}]', '145', 'prueba')
ON CONFLICT (cm_id_consulta) DO NOTHING;

-- examen_fisico (11 rows)
INSERT INTO examen_fisico (ef_id_examen_fisico, ef_peso_mascota, ef_fr, ef_fc, ef_pulso, ef_tllc, ef_deshidratacion, ef_trufa, ef_turgencia_piel, ef_temperatura, ef_reflejo_pupilar, ef_palp_abdominal, ef_estado_conciencia, ef_apariencia_general, ef_color_mucosas, ef_boca_dientes, ef_ojos, ef_oidos, ef_piel_pelo, ef_sonidos_cardiacos, ef_musculo_esqueletico, ef_otros, ef_cm_id_consulta) VALUES
    (1, 4, 'si', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'estable', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'normal', NULL, NULL, NULL, 1),
    (2, 3, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2),
    (3, 4, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 3),
    (4, 6, '30 res/min', '110 lat/min', 'fuerte', '2seg', 'no aplica', 'nariz reseca', '2 seg', '38', 'scpa', 'scpa', 'alerta', 'normal', 'rosadas', 'enfermedad perodontal 6', 'catarata bilateral', 'scpa', 'scpa', '  soplo cardiaco', 'artrosis ', 'scpa', 4),
    (5, 5, NULL, '45', NULL, NULL, NULL, NULL, NULL, '69', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'normales', NULL, NULL, 5),
    (6, 5, 'rr', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 6),
    (7, 5, 'rr', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 7),
    (8, 5, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 9),
    (9, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 10),
    (10, 5, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 11),
    (11, 21, 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 12)
ON CONFLICT (ef_id_examen_fisico) DO NOTHING;

-- ectoparasitos (11 rows)
INSERT INTO ectoparasitos (e_id_ectoparasitos, e_pulgas, e_garrapatas, e_pruito, e_descripcion_pulgas, e_descripcion_garrapatas, e_descripcion_pruito, e_copro_directo, e_copro_flotacion, e_cm_id_consulta) VALUES
    (1, 'N', 'N', 'N', NULL, NULL, NULL, NULL, NULL, 1),
    (2, 'N', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2),
    (3, 'N', 'N', 'N', NULL, NULL, NULL, NULL, NULL, 3),
    (4, 'N', 'N', 'N', NULL, NULL, NULL, NULL, NULL, 4),
    (5, 'N', 'N', 'N', NULL, NULL, NULL, NULL, NULL, 5),
    (6, 'S', 'S', 'S', 'rrrr', 'rrrr', 'rrr', NULL, NULL, 6),
    (7, 'S', 'S', 'N', 'rrrr', 'rrrr', NULL, 'N', 'N', 7),
    (8, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 9),
    (9, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 10),
    (10, 'S', 'S', 'S', NULL, NULL, NULL, NULL, NULL, 11),
    (11, 'S', 'S', 'S', 'hbkjh', 'njbk', 'nvjn', 'S', 'S', 12)
ON CONFLICT (e_id_ectoparasitos) DO NOTHING;

-- plan_diagnostico (11 rows)
INSERT INTO plan_diagnostico (pd_id_plan_diagnostico, pd_raspado, pd_citologia, pd_rx_contraste, pd_perfil_renal, pd_quimica_sanguinea, pd_perfil_preanestesico, pd_perfil_hepatico, pd_snap, pd_radiografia, pd_endoscopia, pd_hospitalizacion, pd_sedacion, pd_anestesia, pd_suturas, pd_observacion, pd_interconsulta, pd_cm_id_consulta) VALUES
    (1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'S', NULL, NULL, NULL, NULL, NULL, 1),
    (2, NULL, NULL, NULL, 'S', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'S', NULL, 'S', 2),
    (3, NULL, NULL, NULL, 'N', NULL, 'N', 'N', NULL, NULL, NULL, NULL, 'S', NULL, NULL, 'S', NULL, 3),
    (4, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'S', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4),
    (5, NULL, NULL, NULL, NULL, 'S', NULL, NULL, NULL, 'S', NULL, 'S', NULL, NULL, NULL, NULL, NULL, 5),
    (6, 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 6),
    (7, 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 7),
    (8, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 9),
    (9, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 10),
    (10, 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 11),
    (11, 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 12)
ON CONFLICT (pd_id_plan_diagnostico) DO NOTHING;

-- seguimiento (3 rows)
INSERT INTO seguimiento (s_id_seguimiento, s_cm_id_consulta, s_seguimiento, s_formula, s_fecha_seguimiento) VALUES
    (5, 12, 'prueba', 'prueba', '2026-05-08'),
    (6, 12, 'prueba', 'prueba', '2026-05-08'),
    (7, 6, 'nuevo seguimiento', 'formula de nuevo seguimiento', '2026-05-08')
ON CONFLICT (s_id_seguimiento) DO NOTHING;


-- ============================================================
-- PARTE 4B: DATOS (DML) - Tablas de Inventario
-- ============================================================

-- proveedores (2 rows)
INSERT INTO proveedores (prov_id_proveedor, prov_nombre, prov_nit, prov_telefono, prov_correo, prov_direccion, prov_contacto, prov_condiciones_comerciales, prov_notas) VALUES
    (1, 'Prueba BR', '12564555', 32251456123, 'Hynsnn@gmail.com', 'Calle', 'el dueño', NULL, NULL),
    (2, 'pepito peres', '879516', 5465465161, 'pepito@peres.com', '2135', 'el dueño', NULL, NULL)
ON CONFLICT (prov_id_proveedor) DO NOTHING;

-- productos (4 rows)
INSERT INTO productos (pr_id_producto, pr_nombre, pr_descripcion, pr_cat_id_categoria, pr_prov_id_proveedor, pr_costo_compra, pr_precio_venta, pr_cantidad_disponible, pr_stock_minimo, pr_lote, pr_fecha_vencimiento) VALUES
    (1, 'BR Cat Salmon Castrados', 'Alimento con sabor a salmon para gatos castrados', 2, 1, 56000, 180000, 1, 2, '1254666', '2027-07-21'),
    (2, 'juguetes', 'juguetes', 3, 2, 5000, 15000, 0, 2, '00000', NULL),
    (3, 'Enrofloxacina', 'antibiótico de amplio espectro que se usa en perros y gatos para tratar infecciones bacterianas (piel, vías respiratorias, urinarias, etc.).', 1, 2, 5000, 8000, 48, 10, '5458787', '2027-04-05'),
    (4, 'dexametasona', 'prueba inyeccion', 1, 2, 35000, 50000, 100, 10, '3213213', '2027-06-29')
ON CONFLICT (pr_id_producto) DO NOTHING;

-- ordenes_compra (1 row)
INSERT INTO ordenes_compra (oc_id_orden, oc_prov_id_proveedor, oc_numero_orden, oc_fecha_creacion, oc_total, oc_eoc_id_estado) VALUES
    (1, 2, 1, '2026-05-01', 5000, 1)
ON CONFLICT (oc_id_orden) DO NOTHING;

-- detalle_orden_compra (1 row)
INSERT INTO detalle_orden_compra (doc_id_detalle, doc_oc_id_orden, doc_pr_id_producto, doc_cantidad, doc_costo_unitario, doc_subtotal, doc_cantidad_recibida) VALUES
    (1, 1, 2, 1, 5000, 5000, 0)
ON CONFLICT (doc_id_detalle) DO NOTHING;

-- ventas (2 rows)
INSERT INTO ventas (vt_id_venta, vt_numero_venta, vt_fecha_venta, vt_dc_id_cliente, vt_total, vt_nombre_cliente) VALUES
    (1, 1, '2026-05-01', 1, 390000, 'John Alexander Moreno Garzon'),
    (2, 2, '2026-05-05', NULL, 15000, 'Consumidor Final')
ON CONFLICT (vt_id_venta) DO NOTHING;

-- detalle_venta (3 rows)
INSERT INTO detalle_venta (dv_id_detalle, dv_vt_id_venta, dv_pr_id_producto, dv_cantidad, dv_precio_unitario, dv_costo_unitario, dv_subtotal) VALUES
    (1, 1, 2, 2, 15000, 5000, 30000),
    (2, 1, 1, 2, 180000, 56000, 360000),
    (3, 2, 2, 1, 15000, 5000, 15000)
ON CONFLICT (dv_id_detalle) DO NOTHING;

-- movimientos_inventario (6 rows)
INSERT INTO movimientos_inventario (mi_id_movimiento, mi_pr_id_producto, mi_tmi_id_tipo, mi_fecha, mi_cantidad, mi_costo_unitario, mi_saldo_resultante, mi_referencia_orden, mi_referencia_venta, mi_notas) VALUES
    (1, 2, 2, '2026-05-01', 2, 5000, 1, NULL, 1, NULL),
    (2, 1, 2, '2026-05-01', 2, 56000, 1, NULL, 1, NULL),
    (3, 2, 2, '2026-05-05', 1, 5000, 0, NULL, 2, NULL),
    (4, 3, 4, '2026-05-06', 10, 5000, 0, NULL, NULL, 'Consulta médica #10'),
    (5, 3, 4, '2026-05-07', 1, 5000, 49, NULL, NULL, 'Consulta médica #11'),
    (6, 3, 4, '2026-05-08', 1, 5000, 48, NULL, NULL, 'Consulta médica #12')
ON CONFLICT (mi_id_movimiento) DO NOTHING;

-- ============================================================
-- PARTE 4C: DATOS (DML) - Tablas de Agenda
-- ============================================================

-- tipo_cita (6 rows)
INSERT INTO tipo_cita (tc_id_tipo_cita, tc_nombre, tc_duracion_minutos, tc_precio, tc_color, tc_pv_documento) VALUES
    (1, 'Valoración médica inicial', 60, 50000, '#007bff', NULL),
    (2, 'Consulta de seguimiento', 30, 35000, '#28a745', NULL),
    (3, 'Vacunación', 15, 25000, '#17a2b8', NULL),
    (4, 'Desparasitación', 15, 20000, '#6f42c1', NULL),
    (5, 'Grooming', 120, 40000, '#e83e8c', NULL),
    (6, 'Cirugía', 120, 200000, '#ff6600', NULL)
ON CONFLICT (tc_id_tipo_cita) DO NOTHING;

-- citas (12 rows)
INSERT INTO citas (ct_id_cita, ct_dc_id_cliente, ct_dm_id_mascota, ct_tc_id_tipo_cita, ct_pv_documento, ct_eci_id_estado_cita, ct_fecha, ct_hora_inicio, ct_hora_fin, ct_notas, ct_cm_id_consulta, ct_fecha_creacion, ct_fecha_original, ct_hora_original) VALUES
    (1, 1, 1, 2, 1030598618, 3, '2026-05-04', '14:00:00', '14:30:00', NULL, NULL, '2026-05-01 21:22:10.201332', NULL, NULL),
    (2, 2, 3, 1, 1030598618, 2, '2026-05-04', '16:30:00', '17:30:00', NULL, NULL, '2026-05-01 21:25:01.455322', NULL, NULL),
    (3, 3, 4, 2, 1030598618, 1, '2026-05-01', '23:00:00', '23:30:00', NULL, 8, '2026-05-02 03:11:05.25166', NULL, NULL),
    (4, 3, 4, 2, 1030598618, 2, '2026-05-08', '10:00:00', '10:30:00', NULL, NULL, '2026-05-05 00:47:35.757559', NULL, NULL),
    (5, 3, 4, 5, 1030598618, 1, '2026-05-08', '05:30:00', '07:00:00', NULL, NULL, '2026-05-05 22:21:13.544826', NULL, NULL),
    (6, 1, 2, 3, 52936566, 1, '2026-05-07', '09:00:00', '09:15:00', NULL, NULL, '2026-05-05 22:37:49.408576', NULL, NULL),
    (7, 3, 4, 2, 52936566, 2, '2026-05-06', '17:00:00', '17:30:00', NULL, NULL, '2026-05-06 00:22:22.516413', NULL, NULL),
    (8, 1, 1, 6, 1030598618, 1, '2026-05-08', '11:00:00', '13:00:00', NULL, NULL, '2026-05-06 22:04:55.757769', NULL, NULL),
    (9, 1, 1, 6, 1030598618, 2, '2026-05-08', '07:30:00', '09:30:00', NULL, 11, '2026-05-07 02:03:59.458926', NULL, NULL),
    (10, 1, 1, 2, 52936566, 1, '2026-05-07', '12:30:00', '13:00:00', NULL, NULL, '2026-05-07 02:39:34.124364', NULL, NULL),
    (11, 3, 4, 4, 52936566, 1, '2026-05-07', '08:30:00', '08:45:00', NULL, NULL, '2026-05-07 02:40:15.532671', NULL, NULL),
    (12, 2, 3, 1, 52936566, 1, '2026-05-07', '11:30:00', '12:30:00', NULL, NULL, '2026-05-07 02:45:06.524184', NULL, NULL)
ON CONFLICT (ct_id_cita) DO NOTHING;

-- horario_veterinario (8 rows)
INSERT INTO horario_veterinario (hv_id_horario, hv_pv_documento, hv_dia_semana, hv_hora_inicio, hv_hora_fin, hv_buffer_minutos) VALUES
    (2, 1030598618, 1, '10:00:00', '18:00:00', 0),
    (3, 1030598618, 5, '00:00:00', '23:59:00', 0),
    (4, 52936566, 1, '08:00:00', '18:00:00', 0),
    (5, 52936566, 2, '08:00:00', '18:00:00', 0),
    (6, 52936566, 3, '08:00:00', '18:00:00', 0),
    (7, 52936566, 4, '08:00:00', '18:00:00', 0),
    (8, 52936566, 5, '08:00:00', '18:00:00', 0),
    (9, 52936566, 6, '08:00:00', '18:00:00', 0)
ON CONFLICT (hv_id_horario) DO NOTHING;

-- bloqueo_horario (1 row)
INSERT INTO bloqueo_horario (bh_id_bloqueo, bh_pv_documento, bh_fecha, bh_hora_inicio, bh_hora_fin, bh_motivo) VALUES
    (1, 1030598618, '2026-05-05', '00:00:00', '23:59:00', 'no trabaja')
ON CONFLICT (bh_id_bloqueo) DO NOTHING;

-- ============================================================
-- PARTE 4D: DATOS (DML) - Tablas de Roles/Permisos
-- ============================================================

-- permisos (32 rows)
INSERT INTO permisos (pm_id_permiso, pm_rl_id_rol, pm_md_id_modulo) VALUES
    (1, 1, 1),
    (2, 1, 2),
    (3, 1, 3),
    (4, 1, 4),
    (5, 1, 7),
    (6, 2, 1),
    (7, 2, 2),
    (8, 2, 3),
    (9, 2, 4),
    (10, 2, 5),
    (11, 2, 6),
    (12, 2, 7),
    (13, 2, 8),
    (14, 2, 9),
    (15, 3, 1),
    (16, 3, 2),
    (17, 3, 3),
    (18, 4, 1),
    (19, 4, 2),
    (20, 4, 3),
    (21, 5, 1),
    (22, 5, 2),
    (23, 5, 3),
    (24, 6, 1),
    (25, 6, 2),
    (26, 6, 3),
    (27, 6, 4),
    (28, 6, 5),
    (29, 6, 6),
    (30, 6, 7),
    (31, 6, 8),
    (32, 6, 9)
ON CONFLICT (pm_id_permiso) DO NOTHING;

-- ============================================================
-- PARTE 4E: DATOS (DML) - Tabla de Adjuntos
-- NOTA: La columna a_base64 se excluye del backup por contener
-- datos binarios codificados en base64 de gran tamaño.
-- Para restaurar los adjuntos completos, se requiere re-subir
-- los archivos originales.
-- ============================================================

-- adjuntos (4 rows) - SIN datos base64
INSERT INTO adjuntos (a_id_adjunto, a_s_id_seguimiento, a_nombre_archivo, a_tipo_archivo, a_base64, a_fecha_registro) VALUES
    (1, 5, 'vitamina-para-mascotas.png', 'image/png', '-- BASE64_DATA_EXCLUDED --', '2026-05-08 02:09:09.204911'),
    (2, 6, 'perro (1).png', 'image/png', '-- BASE64_DATA_EXCLUDED --', '2026-05-08 02:19:02.88715'),
    (3, 6, 'agenda.png', 'image/png', '-- BASE64_DATA_EXCLUDED --', '2026-05-08 02:19:03.097548'),
    (4, 7, 'vitamina-para-mascotas.png', 'image/png', '-- BASE64_DATA_EXCLUDED --', '2026-05-08 02:27:24.629171')
ON CONFLICT (a_id_adjunto) DO NOTHING;

-- ============================================================
-- PARTE 5: Resetear secuencias
-- ============================================================

-- Secuencias de tablas de referencia
SELECT setval('tipo_documento_td_id_t_documento_seq', (SELECT COALESCE(MAX(td_id_t_documento), 0) FROM tipo_documento));
SELECT setval('genero_g_id_genero_seq', (SELECT COALESCE(MAX(g_id_genero), 0) FROM genero));
SELECT setval('moneda_m_id_moneda_seq', (SELECT COALESCE(MAX(m_id_moneda), 0) FROM moneda));
SELECT setval('vacunas_v_id_vacuna_seq', (SELECT COALESCE(MAX(v_id_vacuna), 0) FROM vacunas));

-- Secuencias de tablas principales
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
SELECT setval('seguimiento_s_id_seguimiento_seq', (SELECT COALESCE(MAX(s_id_seguimiento), 0) FROM seguimiento));

-- Secuencias de tablas de inventario
SELECT setval('categoria_producto_cat_id_categoria_seq', (SELECT COALESCE(MAX(cat_id_categoria), 0) FROM categoria_producto));
SELECT setval('estado_orden_compra_eoc_id_estado_seq', (SELECT COALESCE(MAX(eoc_id_estado), 0) FROM estado_orden_compra));
SELECT setval('tipo_movimiento_inventario_tmi_id_tipo_seq', (SELECT COALESCE(MAX(tmi_id_tipo), 0) FROM tipo_movimiento_inventario));
SELECT setval('proveedores_prov_id_proveedor_seq', (SELECT COALESCE(MAX(prov_id_proveedor), 0) FROM proveedores));
SELECT setval('productos_pr_id_producto_seq', (SELECT COALESCE(MAX(pr_id_producto), 0) FROM productos));
SELECT setval('ordenes_compra_oc_id_orden_seq', (SELECT COALESCE(MAX(oc_id_orden), 0) FROM ordenes_compra));
SELECT setval('detalle_orden_compra_doc_id_detalle_seq', (SELECT COALESCE(MAX(doc_id_detalle), 0) FROM detalle_orden_compra));
SELECT setval('recepcion_compra_rc_id_recepcion_seq', (SELECT COALESCE(MAX(rc_id_recepcion), 0) FROM recepcion_compra));
SELECT setval('facturas_compra_fc_id_factura_seq', (SELECT COALESCE(MAX(fc_id_factura), 0) FROM facturas_compra));
SELECT setval('ventas_vt_id_venta_seq', (SELECT COALESCE(MAX(vt_id_venta), 0) FROM ventas));
SELECT setval('detalle_venta_dv_id_detalle_seq', (SELECT COALESCE(MAX(dv_id_detalle), 0) FROM detalle_venta));
SELECT setval('movimientos_inventario_mi_id_movimiento_seq', (SELECT COALESCE(MAX(mi_id_movimiento), 0) FROM movimientos_inventario));

-- Secuencias de tablas de agenda
SELECT setval('tipo_cita_tc_id_tipo_cita_seq', (SELECT COALESCE(MAX(tc_id_tipo_cita), 0) FROM tipo_cita));
SELECT setval('citas_ct_id_cita_seq', (SELECT COALESCE(MAX(ct_id_cita), 0) FROM citas));
SELECT setval('horario_veterinario_hv_id_horario_seq', (SELECT COALESCE(MAX(hv_id_horario), 0) FROM horario_veterinario));
SELECT setval('bloqueo_horario_bh_id_bloqueo_seq', (SELECT COALESCE(MAX(bh_id_bloqueo), 0) FROM bloqueo_horario));
SELECT setval('dia_no_laboral_dnl_id_dia_seq', (SELECT COALESCE(MAX(dnl_id_dia), 0) FROM dia_no_laboral));

-- Secuencias de tablas de roles/permisos
SELECT setval('roles_rl_id_rol_seq', (SELECT COALESCE(MAX(rl_id_rol), 0) FROM roles));
SELECT setval('modulos_md_id_modulo_seq', (SELECT COALESCE(MAX(md_id_modulo), 0) FROM modulos));
SELECT setval('permisos_pm_id_permiso_seq', (SELECT COALESCE(MAX(pm_id_permiso), 0) FROM permisos));

-- Secuencias de tabla adjuntos
SELECT setval('adjuntos_a_id_adjunto_seq', (SELECT COALESCE(MAX(a_id_adjunto), 0) FROM adjuntos));

-- ============================================================
-- FIN DEL BACKUP v3
-- Total tablas: 38
-- Tablas con datos: 29
-- Tablas vacías (solo DDL): 9
--   (tipo_documento, genero, moneda, vacunas, estado_consulta,
--    historial_clinico, info_vacunacion, recepcion_compra,
--    facturas_compra, dia_no_laboral)
-- NOTA: Los datos de referencia (tipo_documento, genero, moneda,
--   estado_consulta) se incluyen como INSERT aunque la tabla
--   muestre 0 rows en el schema (datos insertados vía seed).
-- ============================================================
