-- =============================================
-- BACKUP BASE DE DATOS PETCARE BONAMUR
-- Fecha: 2026-05-27
-- Proyecto Supabase: nlqtzidfowoxylporidi
-- =============================================

-- TABLAS DE REFERENCIA
CREATE TABLE IF NOT EXISTS genero (g_id_genero SERIAL PRIMARY KEY, g_genero VARCHAR(30) NOT NULL);
CREATE TABLE IF NOT EXISTS tipo_documento (td_id_t_documento SERIAL PRIMARY KEY, td_t_documento VARCHAR(50) NOT NULL);
CREATE TABLE IF NOT EXISTS moneda (m_id_moneda SERIAL PRIMARY KEY, m_moneda VARCHAR(20) NOT NULL);
CREATE TABLE IF NOT EXISTS roles (rl_id_rol SERIAL PRIMARY KEY, rl_nombre VARCHAR(50) NOT NULL, rl_descripcion TEXT);
CREATE TABLE IF NOT EXISTS modulos (md_id_modulo SERIAL PRIMARY KEY, md_nombre VARCHAR(50) NOT NULL, md_ruta VARCHAR(100) NOT NULL);
CREATE TABLE IF NOT EXISTS estado_consulta (ec_id_estado INTEGER NOT NULL PRIMARY KEY, ec_estado_consulta VARCHAR(100) NOT NULL);
CREATE TABLE IF NOT EXISTS estado_cita (eci_id_estado_cita INTEGER NOT NULL PRIMARY KEY, eci_estado VARCHAR(50), eci_color VARCHAR(20));
CREATE TABLE IF NOT EXISTS estado_orden_compra (eoc_id_estado SERIAL PRIMARY KEY, eoc_estado VARCHAR(50));
CREATE TABLE IF NOT EXISTS tipo_movimiento_inventario (tmi_id_tipo SERIAL PRIMARY KEY, tmi_tipo VARCHAR(50));
CREATE TABLE IF NOT EXISTS unidad_medida (um_id_unidad SERIAL PRIMARY KEY, um_nombre VARCHAR(50) NOT NULL, um_abreviatura VARCHAR(10) NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS vacunas (v_id_vacuna SERIAL PRIMARY KEY, v_nombre_vacuna VARCHAR(100) NOT NULL);

-- TABLAS PRINCIPALES
CREATE TABLE IF NOT EXISTS personal_vet (
    pv_documento INTEGER NOT NULL PRIMARY KEY,
    pv_primer_nombre VARCHAR(50) NOT NULL,
    pv_segundo_nombre VARCHAR(50),
    pv_primer_apellido VARCHAR(50) NOT NULL,
    pv_segundo_apellido VARCHAR(50),
    pv_td_id_t_documento INTEGER NOT NULL REFERENCES tipo_documento(td_id_t_documento),
    pv_g_id_genero INTEGER NOT NULL REFERENCES genero(g_id_genero),
    pv_email TEXT NOT NULL,
    pv_username TEXT
);

CREATE TABLE IF NOT EXISTS info_contacto (
    ic_id_info_contacto SERIAL PRIMARY KEY,
    ic_pv_documento INTEGER NOT NULL REFERENCES personal_vet(pv_documento),
    ic_telefono BIGINT NOT NULL,
    ic_direccion VARCHAR(150) NOT NULL,
    ic_contacto_emer BIGINT NOT NULL,
    ic_contacto_emer_nom VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS info_laboral (
    il_id_info_laboral SERIAL PRIMARY KEY,
    il_pv_documento INTEGER NOT NULL REFERENCES personal_vet(pv_documento),
    il_cv_id_cargo INTEGER NOT NULL,
    il_salario INTEGER NOT NULL,
    il_m_id_moneda INTEGER NOT NULL REFERENCES moneda(m_id_moneda),
    il_fecha_ingreso DATE NOT NULL,
    il_fecha_retiro DATE
);

CREATE TABLE IF NOT EXISTS rol_vet (
    rv_id_rol SERIAL PRIMARY KEY,
    rv_rol VARCHAR(50) NOT NULL,
    rv_usuario VARCHAR(50) NOT NULL,
    rv_ultimo_login DATE NOT NULL,
    rv_permisos TEXT NOT NULL,
    rv_estado BOOLEAN NOT NULL,
    rv_pv_documento INTEGER NOT NULL REFERENCES personal_vet(pv_documento),
    rv_rl_id_rol INTEGER REFERENCES roles(rl_id_rol)
);

CREATE TABLE IF NOT EXISTS permisos (
    pm_id_permiso SERIAL PRIMARY KEY,
    pm_rl_id_rol INTEGER NOT NULL REFERENCES roles(rl_id_rol),
    pm_md_id_modulo INTEGER NOT NULL REFERENCES modulos(md_id_modulo)
);

CREATE TABLE IF NOT EXISTS datos_cliente (
    dc_id_cliente SERIAL PRIMARY KEY,
    dc_nombre VARCHAR(100) NOT NULL,
    dc_td_id_t_documento INTEGER NOT NULL REFERENCES tipo_documento(td_id_t_documento),
    dc_direccion VARCHAR(150) NOT NULL,
    dc_telefono BIGINT NOT NULL,
    dc_identificacion BIGINT NOT NULL,
    dc_correo TEXT
);

CREATE TABLE IF NOT EXISTS datos_mascota (
    dm_id_mascota SERIAL PRIMARY KEY,
    dm_dc_id_cliente INTEGER NOT NULL REFERENCES datos_cliente(dc_id_cliente),
    dm_nombre VARCHAR(50) NOT NULL,
    dm_especie VARCHAR(50) NOT NULL,
    dm_raza VARCHAR(50) NOT NULL,
    dm_sexo VARCHAR(20) NOT NULL,
    dm_peso DOUBLE PRECISION NOT NULL,
    dm_fecha_nacimiento DATE,
    dm_esterilizado TEXT DEFAULT 'N'
);

CREATE TABLE IF NOT EXISTS info_vacunacion (
    iv_id_info_vacunas SERIAL PRIMARY KEY,
    iv_v_id_vacuna INTEGER NOT NULL REFERENCES vacunas(v_id_vacuna),
    iv_dm_id_mascota INTEGER NOT NULL REFERENCES datos_mascota(dm_id_mascota),
    iv_fecha_vacunacion DATE NOT NULL
);

-- CONSULTAS MÉDICAS
CREATE TABLE IF NOT EXISTS consulta_medica (
    cm_id_consulta SERIAL PRIMARY KEY,
    cm_dc_id_cliente INTEGER NOT NULL REFERENCES datos_cliente(dc_id_cliente),
    cm_dm_id_mascota INTEGER NOT NULL REFERENCES datos_mascota(dm_id_mascota),
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

CREATE TABLE IF NOT EXISTS examen_fisico (
    ef_id_examen_fisico SERIAL PRIMARY KEY,
    ef_peso_mascota INTEGER NOT NULL,
    ef_fr TEXT, ef_fc TEXT, ef_pulso TEXT, ef_tllc TEXT, ef_deshidratacion TEXT,
    ef_trufa TEXT, ef_turgencia_piel TEXT, ef_temperatura TEXT, ef_reflejo_pupilar TEXT,
    ef_palp_abdominal TEXT, ef_estado_conciencia TEXT, ef_apariencia_general TEXT,
    ef_color_mucosas TEXT, ef_boca_dientes TEXT, ef_ojos TEXT, ef_oidos TEXT,
    ef_piel_pelo TEXT, ef_sonidos_cardiacos TEXT, ef_musculo_esqueletico TEXT, ef_otros TEXT,
    ef_cm_id_consulta INTEGER REFERENCES consulta_medica(cm_id_consulta)
);

CREATE TABLE IF NOT EXISTS ectoparasitos (
    e_id_ectoparasitos SERIAL PRIMARY KEY,
    e_pulgas TEXT, e_garrapatas TEXT, e_pruito TEXT,
    e_descripcion_pulgas TEXT, e_descripcion_garrapatas TEXT, e_descripcion_pruito TEXT,
    e_copro_directo TEXT, e_copro_flotacion TEXT,
    e_cm_id_consulta INTEGER REFERENCES consulta_medica(cm_id_consulta)
);

CREATE TABLE IF NOT EXISTS plan_diagnostico (
    pd_id_plan_diagnostico SERIAL PRIMARY KEY,
    pd_raspado TEXT, pd_citologia TEXT, pd_rx_contraste TEXT, pd_perfil_renal TEXT,
    pd_quimica_sanguinea TEXT, pd_perfil_preanestesico TEXT, pd_perfil_hepatico TEXT,
    pd_snap TEXT, pd_radiografia TEXT, pd_endoscopia TEXT, pd_hospitalizacion TEXT,
    pd_sedacion TEXT, pd_anestesia TEXT, pd_suturas TEXT, pd_observacion TEXT, pd_interconsulta TEXT,
    pd_cm_id_consulta INTEGER REFERENCES consulta_medica(cm_id_consulta)
);

CREATE TABLE IF NOT EXISTS seguimiento (
    s_id_seguimiento INTEGER NOT NULL PRIMARY KEY,
    s_cm_id_consulta INTEGER NOT NULL REFERENCES consulta_medica(cm_id_consulta),
    s_seguimiento TEXT NOT NULL,
    s_formula TEXT,
    s_fecha_seguimiento DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS adjuntos (
    a_id_adjunto SERIAL PRIMARY KEY,
    a_s_id_seguimiento INTEGER NOT NULL REFERENCES seguimiento(s_id_seguimiento),
    a_nombre_archivo VARCHAR(255) NOT NULL,
    a_tipo_archivo VARCHAR(100) NOT NULL,
    a_base64 TEXT NOT NULL,
    a_fecha_registro TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS historial_clinico (
    hc_id_historial SERIAL PRIMARY KEY,
    hc_dm_id_mascota INTEGER NOT NULL REFERENCES datos_mascota(dm_id_mascota),
    hc_pv_documento INTEGER NOT NULL REFERENCES personal_vet(pv_documento),
    hc_fecha DATE NOT NULL,
    hc_historial TEXT NOT NULL
);

-- AGENDA
CREATE TABLE IF NOT EXISTS tipo_cita (
    tc_id_tipo_cita SERIAL PRIMARY KEY,
    tc_nombre VARCHAR(100),
    tc_duracion_minutos INTEGER NOT NULL,
    tc_precio DOUBLE PRECISION NOT NULL DEFAULT 0,
    tc_pv_documento INTEGER REFERENCES personal_vet(pv_documento)
);

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
    ct_cm_id_consulta INTEGER,
    ct_fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
    ct_fecha_original DATE,
    ct_hora_original TIME
);

CREATE TABLE IF NOT EXISTS horario_veterinario (
    hv_id_horario SERIAL PRIMARY KEY,
    hv_pv_documento INTEGER NOT NULL REFERENCES personal_vet(pv_documento),
    hv_dia_semana INTEGER NOT NULL,
    hv_hora_inicio TIME NOT NULL,
    hv_hora_fin TIME NOT NULL,
    hv_buffer_minutos INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bloqueo_horario (
    bh_id_bloqueo SERIAL PRIMARY KEY,
    bh_pv_documento INTEGER REFERENCES personal_vet(pv_documento),
    bh_fecha DATE NOT NULL,
    bh_hora_inicio TIME NOT NULL,
    bh_hora_fin TIME NOT NULL,
    bh_motivo TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dia_no_laboral (
    dnl_id_dia SERIAL PRIMARY KEY,
    dnl_fecha DATE NOT NULL,
    dnl_motivo TEXT
);

-- INVENTARIO
CREATE TABLE IF NOT EXISTS categoria_producto (
    cat_id_categoria SERIAL PRIMARY KEY,
    cat_nombre VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS proveedores (
    prov_id_proveedor SERIAL PRIMARY KEY,
    prov_nombre VARCHAR(200),
    prov_nit VARCHAR(50),
    prov_telefono BIGINT NOT NULL,
    prov_condiciones_comerciales TEXT,
    prov_notas TEXT
);

CREATE TABLE IF NOT EXISTS productos (
    pr_id_producto SERIAL PRIMARY KEY,
    pr_nombre VARCHAR(200),
    pr_descripcion TEXT NOT NULL,
    pr_cat_id_categoria INTEGER NOT NULL REFERENCES categoria_producto(cat_id_categoria),
    pr_prov_id_proveedor INTEGER NOT NULL REFERENCES proveedores(prov_id_proveedor),
    pr_costo_compra DOUBLE PRECISION NOT NULL,
    pr_precio_venta DOUBLE PRECISION NOT NULL,
    pr_cantidad_disponible INTEGER NOT NULL DEFAULT 0,
    pr_stock_minimo INTEGER NOT NULL,
    pr_lote VARCHAR(100),
    pr_fecha_vencimiento DATE,
    pr_unidad_medida TEXT
);

CREATE TABLE IF NOT EXISTS movimientos_inventario (
    mi_id_movimiento SERIAL PRIMARY KEY,
    mi_pr_id_producto INTEGER NOT NULL REFERENCES productos(pr_id_producto),
    mi_tmi_id_tipo INTEGER NOT NULL REFERENCES tipo_movimiento_inventario(tmi_id_tipo),
    mi_fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    mi_cantidad INTEGER NOT NULL,
    mi_costo_unitario DOUBLE PRECISION NOT NULL,
    mi_saldo_resultante INTEGER NOT NULL,
    mi_referencia_orden INTEGER,
    mi_referencia_venta INTEGER,
    mi_notas TEXT
);

-- COMPRAS
CREATE TABLE IF NOT EXISTS ordenes_compra (
    oc_id_orden SERIAL PRIMARY KEY,
    oc_prov_id_proveedor INTEGER NOT NULL REFERENCES proveedores(prov_id_proveedor),
    oc_numero_orden INTEGER NOT NULL,
    oc_fecha_creacion DATE NOT NULL DEFAULT CURRENT_DATE,
    oc_total DOUBLE PRECISION NOT NULL DEFAULT 0,
    oc_eoc_id_estado INTEGER NOT NULL DEFAULT 1 REFERENCES estado_orden_compra(eoc_id_estado)
);

CREATE TABLE IF NOT EXISTS detalle_orden_compra (
    doc_id_detalle SERIAL PRIMARY KEY,
    doc_oc_id_orden INTEGER NOT NULL REFERENCES ordenes_compra(oc_id_orden),
    doc_pr_id_producto INTEGER NOT NULL REFERENCES productos(pr_id_producto),
    doc_cantidad INTEGER NOT NULL,
    doc_costo_unitario DOUBLE PRECISION NOT NULL,
    doc_subtotal DOUBLE PRECISION NOT NULL,
    doc_cantidad_recibida INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS recepcion_compra (
    rc_id_recepcion SERIAL PRIMARY KEY,
    rc_oc_id_orden INTEGER NOT NULL REFERENCES ordenes_compra(oc_id_orden),
    rc_fecha_recepcion DATE NOT NULL DEFAULT CURRENT_DATE,
    rc_numero_factura VARCHAR(100),
    rc_notas TEXT
);

CREATE TABLE IF NOT EXISTS facturas_compra (
    fc_id_factura SERIAL PRIMARY KEY,
    fc_numero_factura VARCHAR(100),
    fc_fecha_factura DATE NOT NULL,
    fc_oc_id_orden INTEGER NOT NULL REFERENCES ordenes_compra(oc_id_orden),
    fc_prov_id_proveedor INTEGER NOT NULL REFERENCES proveedores(prov_id_proveedor),
    fc_monto_total DOUBLE PRECISION NOT NULL,
    fc_estado_pago VARCHAR(20) DEFAULT 'pendiente'
);

-- VENTAS
CREATE TABLE IF NOT EXISTS ventas (
    vt_id_venta SERIAL PRIMARY KEY,
    vt_numero_venta INTEGER NOT NULL,
    vt_fecha_venta DATE NOT NULL DEFAULT CURRENT_DATE,
    vt_dc_id_cliente INTEGER REFERENCES datos_cliente(dc_id_cliente),
    vt_total DOUBLE PRECISION NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS detalle_venta (
    dv_id_detalle SERIAL PRIMARY KEY,
    dv_vt_id_venta INTEGER NOT NULL REFERENCES ventas(vt_id_venta),
    dv_pr_id_producto INTEGER NOT NULL REFERENCES productos(pr_id_producto),
    dv_cantidad INTEGER NOT NULL,
    dv_precio_unitario DOUBLE PRECISION NOT NULL,
    dv_costo_unitario DOUBLE PRECISION NOT NULL,
    dv_subtotal DOUBLE PRECISION NOT NULL
);

-- PRE-ORDEN CONSULTA
CREATE TABLE IF NOT EXISTS preorden_consulta (
    po_id_preorden SERIAL PRIMARY KEY,
    po_cm_id_consulta INTEGER NOT NULL REFERENCES consulta_medica(cm_id_consulta),
    po_dm_id_mascota INTEGER NOT NULL REFERENCES datos_mascota(dm_id_mascota),
    po_dc_id_cliente INTEGER NOT NULL REFERENCES datos_cliente(dc_id_cliente),
    po_valor_consulta NUMERIC(10,2) NOT NULL DEFAULT 0,
    po_total NUMERIC(10,2) NOT NULL DEFAULT 0,
    po_estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    po_fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
    po_fecha_completada TIMESTAMP,
    CONSTRAINT chk_po_estado CHECK (po_estado IN ('pendiente', 'completada', 'cancelada'))
);

CREATE TABLE IF NOT EXISTS preorden_detalle (
    pd_id_detalle SERIAL PRIMARY KEY,
    pd_po_id_preorden INTEGER NOT NULL REFERENCES preorden_consulta(po_id_preorden) ON DELETE CASCADE,
    pd_pr_id_producto INTEGER NOT NULL REFERENCES productos(pr_id_producto),
    pd_cantidad INTEGER NOT NULL,
    pd_precio_unitario NUMERIC(10,2) NOT NULL,
    pd_subtotal NUMERIC(10,2) NOT NULL,
    CONSTRAINT chk_pd_cantidad CHECK (pd_cantidad > 0),
    CONSTRAINT chk_pd_precio_unitario CHECK (pd_precio_unitario >= 0)
);

-- HOSPITALIZACIÓN
CREATE TABLE IF NOT EXISTS hospitalizaciones (
    h_id_hospitalizacion SERIAL PRIMARY KEY,
    h_mascota_id INTEGER NOT NULL REFERENCES datos_mascota(dm_id_mascota) ON DELETE CASCADE,
    h_cliente_id INTEGER NOT NULL REFERENCES datos_cliente(dc_id_cliente) ON DELETE CASCADE,
    h_veterinario_doc INTEGER REFERENCES personal_vet(pv_documento),
    h_fecha_ingreso DATE NOT NULL DEFAULT CURRENT_DATE,
    h_fecha_egreso DATE,
    h_peso VARCHAR(20),
    h_hidratacion TEXT,
    h_medicamentos_adicionales TEXT,
    h_medico_tratante VARCHAR(200),
    h_auxiliar_tratante VARCHAR(200),
    h_observaciones TEXT,
    h_estado VARCHAR(20) DEFAULT 'activa' CHECK (h_estado IN ('activa', 'finalizada')),
    h_created_at TIMESTAMP DEFAULT NOW(),
    h_updated_at TIMESTAMP,
    h_updated_by VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS hospitalizacion_medicamentos (
    hm_id_medicamento SERIAL PRIMARY KEY,
    hm_hospitalizacion_id INTEGER NOT NULL REFERENCES hospitalizaciones(h_id_hospitalizacion) ON DELETE CASCADE,
    hm_nombre VARCHAR(200) NOT NULL,
    hm_dosis VARCHAR(100),
    hm_via VARCHAR(10) CHECK (hm_via IN ('IV', 'VO', 'SC', 'IM')),
    hm_ml VARCHAR(50),
    hm_orden INTEGER DEFAULT 0,
    hm_activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS hospitalizacion_administraciones (
    hadm_id_administracion SERIAL PRIMARY KEY,
    hadm_medicamento_id INTEGER NOT NULL REFERENCES hospitalizacion_medicamentos(hm_id_medicamento) ON DELETE CASCADE,
    hadm_dia_semana VARCHAR(10) NOT NULL CHECK (hadm_dia_semana IN ('Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo')),
    hadm_hora TIME NOT NULL,
    hadm_aplicado BOOLEAN DEFAULT FALSE,
    hadm_nota TEXT,
    hadm_registrado_por VARCHAR(100),
    hadm_created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hospitalizacion_monitoreo (
    hmon_id_monitoreo SERIAL PRIMARY KEY,
    hmon_hospitalizacion_id INTEGER NOT NULL REFERENCES hospitalizaciones(h_id_hospitalizacion) ON DELETE CASCADE,
    hmon_dia_semana VARCHAR(10) NOT NULL CHECK (hmon_dia_semana IN ('Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo')),
    hmon_turno VARCHAR(2) NOT NULL CHECK (hmon_turno IN ('AM', 'PM')),
    hmon_color_mucosas VARCHAR(50),
    hmon_tllc VARCHAR(50),
    hmon_sed VARCHAR(50),
    hmon_apetito VARCHAR(50),
    hmon_animo VARCHAR(50),
    hmon_temperatura NUMERIC(4,1),
    hmon_frecuencia_cardiaca INTEGER,
    hmon_frecuencia_respiratoria INTEGER,
    hmon_vomitos INTEGER DEFAULT 0,
    hmon_diarreas INTEGER DEFAULT 0,
    hmon_comio BOOLEAN,
    hmon_tomo_agua BOOLEAN,
    hmon_defeco BOOLEAN,
    hmon_observaciones TEXT,
    hmon_registrado_por VARCHAR(100),
    hmon_created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(hmon_hospitalizacion_id, hmon_dia_semana, hmon_turno)
);

CREATE TABLE IF NOT EXISTS hospitalizacion_observaciones (
    hobs_id_observacion SERIAL PRIMARY KEY,
    hobs_hospitalizacion_id INTEGER NOT NULL REFERENCES hospitalizaciones(h_id_hospitalizacion) ON DELETE CASCADE,
    hobs_texto TEXT NOT NULL,
    hobs_tipo VARCHAR(20) DEFAULT 'evolucion' CHECK (hobs_tipo IN ('evolucion', 'monitoreo')),
    hobs_registrado_por VARCHAR(100),
    hobs_created_at TIMESTAMP DEFAULT NOW()
);

-- AUDITORÍA
CREATE TABLE IF NOT EXISTS log_operaciones_masivas (
    lom_id SERIAL PRIMARY KEY,
    lom_usuario_email VARCHAR(200),
    lom_fecha TIMESTAMP DEFAULT NOW(),
    lom_tipo_operacion VARCHAR(100),
    lom_registros_exitosos INTEGER NOT NULL DEFAULT 0,
    lom_registros_rechazados INTEGER NOT NULL DEFAULT 0,
    lom_total_procesados INTEGER NOT NULL DEFAULT 0
);

-- =============================================
-- ÍNDICES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_hospitalizaciones_mascota ON hospitalizaciones(h_mascota_id);
CREATE INDEX IF NOT EXISTS idx_hospitalizaciones_estado ON hospitalizaciones(h_estado);
CREATE INDEX IF NOT EXISTS idx_hospitalizaciones_fecha ON hospitalizaciones(h_fecha_ingreso DESC);
CREATE INDEX IF NOT EXISTS idx_hosp_med_hospitalizacion ON hospitalizacion_medicamentos(hm_hospitalizacion_id);
CREATE INDEX IF NOT EXISTS idx_hosp_adm_medicamento ON hospitalizacion_administraciones(hadm_medicamento_id);
CREATE INDEX IF NOT EXISTS idx_hosp_adm_dia ON hospitalizacion_administraciones(hadm_dia_semana);
CREATE INDEX IF NOT EXISTS idx_hosp_mon_hospitalizacion ON hospitalizacion_monitoreo(hmon_hospitalizacion_id);
CREATE INDEX IF NOT EXISTS idx_hosp_obs_hospitalizacion ON hospitalizacion_observaciones(hobs_hospitalizacion_id);
CREATE INDEX IF NOT EXISTS idx_hosp_obs_tipo ON hospitalizacion_observaciones(hobs_tipo);
CREATE INDEX IF NOT EXISTS idx_preorden_estado ON preorden_consulta(po_estado);
CREATE INDEX IF NOT EXISTS idx_preorden_cliente ON preorden_consulta(po_dc_id_cliente);
CREATE INDEX IF NOT EXISTS idx_preorden_mascota ON preorden_consulta(po_dm_id_mascota);
CREATE INDEX IF NOT EXISTS idx_preorden_detalle_preorden ON preorden_detalle(pd_po_id_preorden);
