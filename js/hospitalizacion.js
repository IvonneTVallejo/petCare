// ================= CONFIG =================
const SUPABASE_URL = "https://nlqtzidfowoxylporidi.supabase.co";
const SUPABASE_KEY = "sb_publishable_Qe7khKcVgFoN1KpXydGbcA_mEddQQNi";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ================= GLOBAL STATE =================
let hospitalizacionActual = null;
let medicamentosCache = [];
let administracionesCache = [];
let monitoreoCache = [];
let observacionesCache = [];
let productosCache = [];
let hospitalizacionesCache = [];
let debounceTimers = {};

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const PARAMETROS_MONITOREO = [
    { key: 'hmon_color_mucosas', label: 'Color mucosas', tipo: 'text' },
    { key: 'hmon_tllc', label: 'TLLC', tipo: 'text' },
    { key: 'hmon_sed', label: 'Sed', tipo: 'text' },
    { key: 'hmon_apetito', label: 'Apetito', tipo: 'text' },
    { key: 'hmon_animo', label: 'Ánimo', tipo: 'text' },
    { key: 'hmon_temperatura', label: 'Temperatura (°C)', tipo: 'number', step: '0.1' },
    { key: 'hmon_frecuencia_cardiaca', label: 'Frecuencia cardíaca', tipo: 'number' },
    { key: 'hmon_frecuencia_respiratoria', label: 'Frecuencia respiratoria', tipo: 'number' },
    { key: 'hmon_vomitos', label: 'Nº Vómitos', tipo: 'number', min: '0' },
    { key: 'hmon_diarreas', label: 'Nº Diarreas', tipo: 'number', min: '0' },
    { key: 'hmon_comio', label: 'Comió', tipo: 'checkbox' },
    { key: 'hmon_tomo_agua', label: 'Tomó agua', tipo: 'checkbox' },
    { key: 'hmon_defeco', label: 'Defecó', tipo: 'checkbox' }
];

// ================= INITIALIZATION =================
document.addEventListener("DOMContentLoaded", async () => {
    await cargarListadoHospitalizaciones();
    await cargarProductosParaAutocompletar();
    inicializarEventListeners();
});

function inicializarEventListeners() {
    // Búsqueda y filtros
    const inputBuscar = document.getElementById('buscarHospitalizacion');
    if (inputBuscar) inputBuscar.addEventListener('input', () => filtrarHospitalizaciones(inputBuscar.value));

    const selectEstado = document.getElementById('filtroEstado');
    if (selectEstado) selectEstado.addEventListener('change', () => filtrarPorEstado(selectEstado.value));

    // Volver al listado
    const btnVolver = document.getElementById('btnVolverListado');
    if (btnVolver) btnVolver.addEventListener('click', mostrarListado);

    // Formulario nueva hospitalización
    const form = document.getElementById('formNuevaHospitalizacion');
    if (form) form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await crearHospitalizacion();
    });

    // Búsqueda de paciente en modal
    const inputPaciente = document.getElementById('buscarPacienteModal');
    if (inputPaciente) inputPaciente.addEventListener('input', debounce(() => buscarPacientes(inputPaciente.value), 300));

    // Agregar medicamento
    const btnAgregarMed = document.getElementById('btnAgregarMedicamento');
    if (btnAgregarMed) btnAgregarMed.addEventListener('click', () => agregarMedicamento(hospitalizacionActual?.h_id_hospitalizacion, {}));

    // Agregar evolución
    const btnEvolucion = document.getElementById('btnAgregarEvolucion');
    if (btnEvolucion) btnEvolucion.addEventListener('click', async () => {
        const textarea = document.getElementById('nuevaEvolucion');
        const texto = textarea.value.trim();
        if (!texto) {
            Swal.fire({ icon: 'warning', title: 'Atención', text: 'Escriba una nota de evolución' });
            return;
        }
        await agregarObservacion(hospitalizacionActual.h_id_hospitalizacion, texto, 'evolucion');
        textarea.value = '';
    });

    // Guardar observación monitoreo
    const btnObsMonitoreo = document.getElementById('btnGuardarObsMonitoreo');
    if (btnObsMonitoreo) btnObsMonitoreo.addEventListener('click', async () => {
        const textarea = document.getElementById('observacionMonitoreo');
        const texto = textarea.value.trim();
        if (!texto) {
            Swal.fire({ icon: 'warning', title: 'Atención', text: 'Escriba una observación' });
            return;
        }
        await agregarObservacion(hospitalizacionActual.h_id_hospitalizacion, texto, 'monitoreo');
        textarea.value = '';
    });

    // Imprimir
    const btnImprimir = document.getElementById('btnImprimir');
    if (btnImprimir) btnImprimir.addEventListener('click', imprimirFicha);

    // Exportar PDF
    const btnPDF = document.getElementById('btnExportarPDF');
    if (btnPDF) btnPDF.addEventListener('click', exportarPDF);

    // Finalizar
    const btnFinalizar = document.getElementById('btnFinalizar');
    if (btnFinalizar) btnFinalizar.addEventListener('click', () => {
        if (hospitalizacionActual) finalizarHospitalizacion(hospitalizacionActual.h_id_hospitalizacion);
    });

    // Ver historial
    const btnHistorial = document.getElementById('btnVerHistorial');
    if (btnHistorial) btnHistorial.addEventListener('click', cargarHistorialPaciente);

    // Autoguardado para campos de texto
    document.querySelectorAll('.campo-autoguardado').forEach(campo => {
        campo.addEventListener('input', () => {
            const nombreCampo = campo.dataset.campo;
            autoguardarCampo(nombreCampo, campo.value);
        });
    });

    // Fecha ingreso default
    const fechaIngreso = document.getElementById('modalFechaIngreso');
    if (fechaIngreso && !fechaIngreso.value) {
        fechaIngreso.value = new Date().toISOString().split('T')[0];
    }
}

// ================= UTILITY FUNCTIONS =================

function obtenerUsuarioActual() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        return user?.email || localStorage.getItem('nombreVet') || 'desconocido';
    } catch {
        return localStorage.getItem('nombreVet') || 'desconocido';
    }
}

function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

function mostrarIndicadorGuardado(estado) {
    const indicator = document.getElementById('saveIndicator');
    if (!indicator) return;
    indicator.className = 'save-indicator';
    if (estado === 'guardando') {
        indicator.textContent = 'Guardando...';
        indicator.classList.add('guardando');
    } else if (estado === 'guardado') {
        indicator.textContent = 'Guardado ✓';
        indicator.classList.add('guardado');
        setTimeout(() => { indicator.className = 'save-indicator'; }, 2000);
    } else if (estado === 'error') {
        indicator.textContent = 'Error al guardar';
        indicator.classList.add('error');
        setTimeout(() => { indicator.className = 'save-indicator'; }, 3000);
    }
}

function calcularEdad(fechaNacimiento) {
    if (!fechaNacimiento) return '';
    const nacimiento = new Date(fechaNacimiento);
    const hoy = new Date();
    const diffMs = hoy - nacimiento;
    const diffAnios = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
    const diffMeses = Math.floor((diffMs % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44));
    if (diffAnios > 0) {
        let edad = `${diffAnios} año${diffAnios > 1 ? 's' : ''}`;
        if (diffMeses > 0) edad += ` ${diffMeses} mes${diffMeses > 1 ? 'es' : ''}`;
        return edad;
    }
    const totalMeses = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
    return `${totalMeses} mes${totalMeses !== 1 ? 'es' : ''}`;
}

// ================= VISTA SWITCHING =================

function mostrarListado() {
    document.getElementById('vistaListado').style.display = 'block';
    document.getElementById('vistaFicha').style.display = 'none';
    hospitalizacionActual = null;
}

function mostrarFicha() {
    document.getElementById('vistaListado').style.display = 'none';
    document.getElementById('vistaFicha').style.display = 'block';
}


// ================= CRUD HOSPITALIZACIONES =================

async function cargarListadoHospitalizaciones() {
    const tbody = document.getElementById('tablaHospitalizaciones');
    if (!tbody) return;

    try {
        const { data, error } = await supabaseClient
            .from("hospitalizaciones")
            .select(`
                *,
                datos_mascota (dm_id_mascota, dm_nombre, dm_especie, dm_raza, dm_fecha_nacimiento),
                datos_cliente (dc_id_cliente, dc_nombre, dc_telefono)
            `)
            .order("h_estado", { ascending: true })
            .order("h_fecha_ingreso", { ascending: false });

        if (error) {
            console.error('Error cargando hospitalizaciones:', error);
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error al cargar datos</td></tr>`;
            return;
        }

        hospitalizacionesCache = data || [];
        renderizarListado(hospitalizacionesCache);
    } catch (err) {
        console.error('Error:', err);
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error de conexión</td></tr>`;
    }
}

function renderizarListado(hospitalizaciones) {
    const tbody = document.getElementById('tablaHospitalizaciones');
    if (!tbody) return;

    if (!hospitalizaciones || hospitalizaciones.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No hay hospitalizaciones registradas</td></tr>`;
        return;
    }

    tbody.innerHTML = hospitalizaciones.map(h => {
        const paciente = h.datos_mascota?.dm_nombre || '-';
        const propietario = h.datos_cliente?.dc_nombre || '-';
        const fechaIngreso = h.h_fecha_ingreso || '-';
        const fechaEgreso = h.h_fecha_egreso || '-';
        const estado = h.h_estado || 'activa';
        const medico = h.h_medico_tratante || '-';
        const badgeClass = estado === 'activa' ? 'badge-activa' : 'badge-finalizada';

        return `
            <tr class="text-center">
                <td>${paciente}</td>
                <td>${propietario}</td>
                <td>${fechaIngreso}</td>
                <td>${fechaEgreso}</td>
                <td><span class="${badgeClass}">${estado}</span></td>
                <td>${medico}</td>
                <td>
                    <button class="btn btn-info btn-sm" onclick="cargarFichaHospitalizacion(${h.h_id_hospitalizacion})">
                        Ver/Editar
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

async function crearHospitalizacion() {
    const mascotaId = document.getElementById('selectedMascotaId').value;
    const clienteId = document.getElementById('selectedClienteId').value;
    const fechaIngreso = document.getElementById('modalFechaIngreso').value;
    const fechaEgreso = document.getElementById('modalFechaEgreso').value;
    const peso = document.getElementById('modalPeso').value;

    // Validación
    const errores = [];
    if (!mascotaId || mascotaId === '0' || mascotaId === '') {
        errores.push('Debe seleccionar un paciente');
    }
    if (!fechaIngreso) {
        errores.push('La fecha de ingreso es obligatoria');
    }

    if (errores.length > 0) {
        Swal.fire({ icon: 'warning', title: 'Campos obligatorios', html: errores.join('<br>') });
        return;
    }

    const usuario = obtenerUsuarioActual();

    const registro = {
        h_mascota_id: parseInt(mascotaId),
        h_cliente_id: parseInt(clienteId),
        h_fecha_ingreso: fechaIngreso,
        h_peso: peso || null,
        h_estado: 'activa',
        h_updated_by: usuario
    };

    if (fechaEgreso) registro.h_fecha_egreso = fechaEgreso;

    const { data, error } = await supabaseClient
        .from("hospitalizaciones")
        .insert([registro])
        .select();

    if (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Error al crear hospitalización: ' + error.message });
        return;
    }

    // Cerrar modal
    $('#modalNuevaHospitalizacion').modal('hide');

    // Limpiar formulario
    document.getElementById('formNuevaHospitalizacion').reset();
    document.getElementById('selectedMascotaId').value = '';
    document.getElementById('selectedClienteId').value = '';
    document.getElementById('modalEdad').value = '';
    document.getElementById('modalRaza').value = '';
    document.getElementById('modalPropietario').value = '';
    document.getElementById('modalTelefono').value = '';
    document.getElementById('modalFechaIngreso').value = new Date().toISOString().split('T')[0];

    Swal.fire({ icon: 'success', title: 'Éxito', text: 'Hospitalización creada correctamente', timer: 1500, showConfirmButton: false });

    // Abrir ficha creada
    if (data && data.length > 0) {
        await cargarFichaHospitalizacion(data[0].h_id_hospitalizacion);
    }
}

async function buscarPacientes(termino) {
    const container = document.getElementById('sugerenciasPaciente');
    if (!container) return;

    if (!termino || termino.trim().length < 2) {
        container.classList.remove('show');
        container.innerHTML = '';
        return;
    }

    // Buscar por nombre del tutor/propietario
    const { data, error } = await supabaseClient
        .from("datos_cliente")
        .select(`
            dc_id_cliente, dc_nombre, dc_telefono,
            datos_mascota (dm_id_mascota, dm_nombre, dm_especie, dm_raza, dm_fecha_nacimiento)
        `)
        .ilike("dc_nombre", `%${termino.trim()}%`)
        .limit(10);

    if (error || !data || data.length === 0) {
        container.classList.remove('show');
        container.innerHTML = '';
        return;
    }

    // Mostrar tutores con sus mascotas
    let html = '';
    data.forEach(cliente => {
        const mascotas = cliente.datos_mascota || [];
        if (mascotas.length === 0) return;

        html += `<div style="padding:6px 12px; background:#f1f3f5; font-weight:600; font-size:0.8rem; border-bottom:1px solid #dee2e6;">
            👤 ${cliente.dc_nombre} - Tel: ${cliente.dc_telefono || 'N/A'}
        </div>`;

        mascotas.forEach(m => {
            const mascotaData = {
                dm_id_mascota: m.dm_id_mascota,
                dm_nombre: m.dm_nombre,
                dm_especie: m.dm_especie,
                dm_raza: m.dm_raza,
                dm_fecha_nacimiento: m.dm_fecha_nacimiento,
                datos_cliente: { dc_id_cliente: cliente.dc_id_cliente, dc_nombre: cliente.dc_nombre, dc_telefono: cliente.dc_telefono }
            };
            html += `<div class="sugerencia-item" data-mascota='${JSON.stringify(mascotaData).replace(/'/g, "&#39;")}' style="padding-left:24px;">
                🐾 <strong>${m.dm_nombre}</strong> (${m.dm_especie || ''} - ${m.dm_raza || ''})
            </div>`;
        });
    });

    if (!html) {
        container.classList.remove('show');
        container.innerHTML = '';
        return;
    }

    container.innerHTML = html;
    container.classList.add('show');

    // Event listeners para selección de mascota
    container.querySelectorAll('.sugerencia-item').forEach(item => {
        item.addEventListener('click', () => {
            const mascota = JSON.parse(item.dataset.mascota);
            seleccionarPaciente(mascota);
            container.classList.remove('show');
        });
    });
}

function seleccionarPaciente(mascota) {
    document.getElementById('buscarPacienteModal').value = mascota.dm_nombre;
    document.getElementById('selectedMascotaId').value = mascota.dm_id_mascota;
    document.getElementById('selectedClienteId').value = mascota.datos_cliente?.dc_id_cliente || '';
    document.getElementById('modalEdad').value = calcularEdad(mascota.dm_fecha_nacimiento);
    document.getElementById('modalRaza').value = mascota.dm_raza || '';
    document.getElementById('modalPropietario').value = mascota.datos_cliente?.dc_nombre || '';
    document.getElementById('modalTelefono').value = mascota.datos_cliente?.dc_telefono || '';
}

async function cargarFichaHospitalizacion(hospitalizacionId) {
    // Cargar hospitalización con datos relacionados
    const { data, error } = await supabaseClient
        .from("hospitalizaciones")
        .select(`
            *,
            datos_mascota (dm_id_mascota, dm_nombre, dm_especie, dm_raza, dm_fecha_nacimiento),
            datos_cliente (dc_id_cliente, dc_nombre, dc_telefono)
        `)
        .eq("h_id_hospitalizacion", hospitalizacionId)
        .single();

    if (error || !data) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar la hospitalización' });
        return;
    }

    hospitalizacionActual = data;

    // Renderizar header
    document.getElementById('fichaPatientName').textContent = data.datos_mascota?.dm_nombre || '-';
    document.getElementById('fichaEspecie').textContent = data.datos_mascota?.dm_especie || '-';
    document.getElementById('fichaRaza').textContent = data.datos_mascota?.dm_raza || '-';
    document.getElementById('fichaEdad').textContent = calcularEdad(data.datos_mascota?.dm_fecha_nacimiento);
    document.getElementById('fichaPeso').textContent = data.h_peso || '-';
    document.getElementById('fichaPropietario').textContent = data.datos_cliente?.dc_nombre || '-';
    document.getElementById('fichaTelefono').textContent = data.datos_cliente?.dc_telefono || '-';
    document.getElementById('fichaFechaIngreso').textContent = data.h_fecha_ingreso || '-';
    document.getElementById('fichaFechaEgreso').textContent = data.h_fecha_egreso || '-';

    // Campos adicionales
    document.getElementById('campoHidratacion').value = data.h_hidratacion || '';
    document.getElementById('campoMedicamentosAdicionales').value = data.h_medicamentos_adicionales || '';
    document.getElementById('campoMedicoTratante').value = data.h_medico_tratante || '';
    document.getElementById('campoObservaciones').value = data.h_observaciones || '';

    // Cargar datos relacionados
    await cargarMedicamentos(hospitalizacionId);
    await cargarMonitoreo(hospitalizacionId);
    await cargarObservaciones(hospitalizacionId);

    // Modo lectura si finalizada
    const soloLectura = data.h_estado === 'finalizada';
    configurarModoLectura(soloLectura);

    // Mostrar ficha
    mostrarFicha();
}

function autoguardarCampo(nombreCampo, valor) {
    if (!hospitalizacionActual) return;

    // Limpiar timer anterior para este campo
    if (debounceTimers[nombreCampo]) {
        clearTimeout(debounceTimers[nombreCampo]);
    }

    debounceTimers[nombreCampo] = setTimeout(async () => {
        await actualizarHospitalizacion(hospitalizacionActual.h_id_hospitalizacion, { [nombreCampo]: valor });
    }, 1500);
}

async function actualizarHospitalizacion(hospitalizacionId, campos) {
    mostrarIndicadorGuardado('guardando');

    const usuario = obtenerUsuarioActual();
    const datosActualizar = {
        ...campos,
        h_updated_at: new Date().toISOString(),
        h_updated_by: usuario
    };

    const { error } = await supabaseClient
        .from("hospitalizaciones")
        .update(datosActualizar)
        .eq("h_id_hospitalizacion", hospitalizacionId);

    if (error) {
        mostrarIndicadorGuardado('error');
        console.error('Error actualizando:', error);
    } else {
        mostrarIndicadorGuardado('guardado');
        // Actualizar cache local
        if (hospitalizacionActual && hospitalizacionActual.h_id_hospitalizacion === hospitalizacionId) {
            Object.assign(hospitalizacionActual, campos);
        }
    }
}

async function finalizarHospitalizacion(hospitalizacionId) {
    const result = await Swal.fire({
        title: '¿Finalizar hospitalización?',
        text: 'Esta acción marcará la hospitalización como finalizada y activará el modo lectura.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#28a745',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, finalizar',
        cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    const fechaEgreso = new Date().toISOString().split('T')[0];
    const usuario = obtenerUsuarioActual();

    const { error } = await supabaseClient
        .from("hospitalizaciones")
        .update({
            h_estado: 'finalizada',
            h_fecha_egreso: fechaEgreso,
            h_updated_at: new Date().toISOString(),
            h_updated_by: usuario
        })
        .eq("h_id_hospitalizacion", hospitalizacionId);

    if (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo finalizar la hospitalización' });
        return;
    }

    Swal.fire({ icon: 'success', title: 'Hospitalización finalizada', text: `Fecha de egreso: ${fechaEgreso}`, timer: 2000, showConfirmButton: false });

    // Actualizar estado local
    if (hospitalizacionActual) {
        hospitalizacionActual.h_estado = 'finalizada';
        hospitalizacionActual.h_fecha_egreso = fechaEgreso;
    }
    document.getElementById('fichaFechaEgreso').textContent = fechaEgreso;
    configurarModoLectura(true);
    await cargarListadoHospitalizaciones();
}


// ================= MEDICAMENTOS =================

async function cargarMedicamentos(hospitalizacionId) {
    const { data, error } = await supabaseClient
        .from("hospitalizacion_medicamentos")
        .select("*")
        .eq("hm_hospitalizacion_id", hospitalizacionId)
        .eq("hm_activo", true)
        .order("hm_orden", { ascending: true });

    if (error) {
        console.error('Error cargando medicamentos:', error);
        return;
    }

    medicamentosCache = data || [];

    // Cargar administraciones de estos medicamentos
    if (medicamentosCache.length > 0) {
        const ids = medicamentosCache.map(m => m.hm_id_medicamento);
        await cargarAdministraciones(ids);
    } else {
        administracionesCache = [];
    }

    renderizarTablaMedicamentos();
}

async function agregarMedicamento(hospitalizacionId, medicamento) {
    if (!hospitalizacionId) return;

    const nuevoMed = {
        hm_hospitalizacion_id: hospitalizacionId,
        hm_nombre: medicamento.nombre || 'Nuevo medicamento',
        hm_dosis: medicamento.dosis || '',
        hm_via: medicamento.via || null,
        hm_ml: medicamento.ml || '',
        hm_orden: medicamentosCache.length,
        hm_activo: true
    };

    const { data, error } = await supabaseClient
        .from("hospitalizacion_medicamentos")
        .insert([nuevoMed])
        .select();

    if (error) {
        console.error('Error agregando medicamento:', error);
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo agregar el medicamento: ' + error.message });
        return;
    }

    if (data && data.length > 0) {
        medicamentosCache.push(data[0]);
        renderizarTablaMedicamentos();
    }
}

async function eliminarMedicamento(medicamentoId) {
    const { error } = await supabaseClient
        .from("hospitalizacion_medicamentos")
        .update({ hm_activo: false })
        .eq("hm_id_medicamento", medicamentoId);

    if (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar el medicamento' });
        return;
    }

    medicamentosCache = medicamentosCache.filter(m => m.hm_id_medicamento !== medicamentoId);
    renderizarTablaMedicamentos();
}

async function duplicarMedicamento(medicamentoId) {
    const original = medicamentosCache.find(m => m.hm_id_medicamento === medicamentoId);
    if (!original) return;

    await agregarMedicamento(hospitalizacionActual.h_id_hospitalizacion, {
        nombre: original.hm_nombre,
        dosis: original.hm_dosis,
        via: original.hm_via,
        ml: original.hm_ml
    });
}

async function actualizarMedicamento(medicamentoId, campo, valor) {
    const { error } = await supabaseClient
        .from("hospitalizacion_medicamentos")
        .update({ [campo]: valor })
        .eq("hm_id_medicamento", medicamentoId);

    if (error) {
        console.error('Error actualizando medicamento:', error);
        return;
    }

    // Actualizar cache
    const med = medicamentosCache.find(m => m.hm_id_medicamento === medicamentoId);
    if (med) med[campo] = valor;
}

async function cargarProductosParaAutocompletar() {
    const { data, error } = await supabaseClient
        .from("productos")
        .select("pr_nombre")
        .eq("pr_cat_id_categoria", 1)
        .order("pr_nombre");

    if (!error && data) {
        productosCache = data;
    }
}

function renderizarTablaMedicamentos() {
    const tbody = document.getElementById('bodyMedicamentos');
    if (!tbody) return;

    if (medicamentosCache.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" class="text-center text-muted">No hay medicamentos registrados. Haga clic en "Agregar Medicamento".</td></tr>`;
        return;
    }

    tbody.innerHTML = medicamentosCache.map(med => {
        const medId = med.hm_id_medicamento;

        // Generar celdas de días de la semana
        const celdasDias = DIAS_SEMANA.map(dia => {
            const admsDia = administracionesCache.filter(a => a.hadm_medicamento_id === medId && a.hadm_dia_semana === dia);
            const chips = admsDia.map(a => {
                const claseChip = a.hadm_aplicado ? 'chip-hora aplicado' : 'chip-hora pendiente';
                const horaStr = a.hadm_hora ? a.hadm_hora.substring(0, 5) : '';
                return `<span class="${claseChip}" data-adm-id="${a.hadm_id_administracion}" 
                    onclick="interaccionChipAdministracion(${a.hadm_id_administracion}, ${a.hadm_aplicado})"
                    title="${a.hadm_nota || ''}">${horaStr}</span>`;
            }).join('');

            return `<td class="celda-dia" data-med-id="${medId}" data-dia="${dia}" onclick="mostrarInputHora(this, ${medId}, '${dia}')">
                <div class="chips-container">${chips}</div>
            </td>`;
        }).join('');

        return `
            <tr data-med-id="${medId}">
                <td>
                    <input type="text" class="form-control form-control-sm med-nombre-input" 
                        value="${med.hm_nombre || ''}" 
                        onchange="actualizarMedicamento(${medId}, 'hm_nombre', this.value)"
                        oninput="mostrarSugerenciasMedicamento(this, ${medId})"
                        autocomplete="off">
                    <div class="sugerencias-dropdown sugerencias-med" id="sugMed${medId}"></div>
                </td>
                <td><input type="text" class="form-control form-control-sm med-dosis-input" value="${med.hm_dosis || ''}" onchange="actualizarMedicamento(${medId}, 'hm_dosis', this.value)"></td>
                <td>
                    <select class="form-control form-control-sm med-via-select" onchange="actualizarMedicamento(${medId}, 'hm_via', this.value)">
                        <option value="">-</option>
                        <option value="IV" ${med.hm_via === 'IV' ? 'selected' : ''}>IV</option>
                        <option value="VO" ${med.hm_via === 'VO' ? 'selected' : ''}>VO</option>
                        <option value="SC" ${med.hm_via === 'SC' ? 'selected' : ''}>SC</option>
                        <option value="IM" ${med.hm_via === 'IM' ? 'selected' : ''}>IM</option>
                    </select>
                </td>
                <td><input type="text" class="form-control form-control-sm med-ml-input" value="${med.hm_ml || ''}" onchange="actualizarMedicamento(${medId}, 'hm_ml', this.value)"></td>
                ${celdasDias}
                <td>
                    <button class="btn btn-outline-primary btn-accion-med" onclick="duplicarMedicamento(${medId})" title="Duplicar">📋</button>
                    <button class="btn btn-outline-danger btn-accion-med" onclick="eliminarMedicamento(${medId})" title="Eliminar">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

function mostrarSugerenciasMedicamento(input, medId) {
    const container = document.getElementById(`sugMed${medId}`);
    if (!container) return;

    const termino = input.value.trim();
    if (termino.length < 2) {
        container.classList.remove('show');
        container.innerHTML = '';
        return;
    }

    const terminoLower = termino.toLowerCase();
    const coincidencias = productosCache.filter(p => (p.pr_nombre || '').toLowerCase().includes(terminoLower)).slice(0, 5);

    if (coincidencias.length === 0) {
        container.classList.remove('show');
        container.innerHTML = '';
        return;
    }

    container.innerHTML = coincidencias.map(p => `
        <div class="sugerencia-item" onclick="seleccionarMedicamentoSugerido(${medId}, '${(p.pr_nombre || '').replace(/'/g, "\\'")}', this)">${p.pr_nombre}</div>
    `).join('');
    container.classList.add('show');
}

function seleccionarMedicamentoSugerido(medId, nombre, element) {
    const row = document.querySelector(`tr[data-med-id="${medId}"]`);
    if (row) {
        const input = row.querySelector('.med-nombre-input');
        if (input) input.value = nombre;
    }
    actualizarMedicamento(medId, 'hm_nombre', nombre);
    const container = element.parentElement;
    container.classList.remove('show');
    container.innerHTML = '';
}


// ================= ADMINISTRACIONES =================

async function cargarAdministraciones(medicamentoIds) {
    if (!medicamentoIds || medicamentoIds.length === 0) {
        administracionesCache = [];
        return;
    }

    const { data, error } = await supabaseClient
        .from("hospitalizacion_administraciones")
        .select("*")
        .in("hadm_medicamento_id", medicamentoIds)
        .order("hadm_hora", { ascending: true });

    if (error) {
        console.error('Error cargando administraciones:', error);
        administracionesCache = [];
        return;
    }

    administracionesCache = data || [];
}

async function registrarAdministracion(medicamentoId, diaSemana, hora) {
    // Validar formato hora
    const regexHora = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!regexHora.test(hora)) {
        Swal.fire({ icon: 'warning', title: 'Formato inválido', text: 'Use formato HH:MM (ej: 08:30)' });
        return;
    }

    const usuario = obtenerUsuarioActual();

    const { data, error } = await supabaseClient
        .from("hospitalizacion_administraciones")
        .insert([{
            hadm_medicamento_id: medicamentoId,
            hadm_dia_semana: diaSemana,
            hadm_hora: hora,
            hadm_aplicado: false,
            hadm_registrado_por: usuario
        }])
        .select();

    if (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo registrar la administración' });
        return;
    }

    if (data && data.length > 0) {
        administracionesCache.push(data[0]);
        renderizarTablaMedicamentos();
    }
}

async function marcarAdministracionAplicada(administracionId) {
    const usuario = obtenerUsuarioActual();

    const { error } = await supabaseClient
        .from("hospitalizacion_administraciones")
        .update({ hadm_aplicado: true, hadm_registrado_por: usuario })
        .eq("hadm_id_administracion", administracionId);

    if (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo marcar como aplicada' });
        return;
    }

    // Actualizar cache
    const adm = administracionesCache.find(a => a.hadm_id_administracion === administracionId);
    if (adm) {
        adm.hadm_aplicado = true;
        adm.hadm_registrado_por = usuario;
    }
    renderizarTablaMedicamentos();
}

async function agregarNotaAdministracion(administracionId, nota) {
    const { error } = await supabaseClient
        .from("hospitalizacion_administraciones")
        .update({ hadm_nota: nota })
        .eq("hadm_id_administracion", administracionId);

    if (error) {
        console.error('Error agregando nota:', error);
        return;
    }

    const adm = administracionesCache.find(a => a.hadm_id_administracion === administracionId);
    if (adm) adm.hadm_nota = nota;
}

function mostrarInputHora(celda, medicamentoId, diaSemana) {
    // Evitar si ya hay un input
    if (celda.querySelector('.input-hora-celda')) return;

    const input = document.createElement('input');
    input.type = 'time';
    input.className = 'input-hora-celda';
    input.addEventListener('change', async function () {
        const hora = this.value;
        if (hora) {
            await registrarAdministracion(medicamentoId, diaSemana, hora);
        }
        this.remove();
    });
    input.addEventListener('blur', function () {
        setTimeout(() => this.remove(), 200);
    });

    celda.appendChild(input);
    input.focus();
}

async function interaccionChipAdministracion(administracionId, yaAplicado) {
    event.stopPropagation();

    if (yaAplicado) {
        // Ya aplicado, mostrar opción de agregar nota
        const { value: nota } = await Swal.fire({
            title: 'Agregar nota',
            input: 'text',
            inputLabel: 'Nota para esta administración',
            inputPlaceholder: 'Escriba una nota...',
            showCancelButton: true,
            cancelButtonText: 'Cancelar',
            confirmButtonText: 'Guardar'
        });
        if (nota) {
            await agregarNotaAdministracion(administracionId, nota);
        }
    } else {
        // Pendiente, ofrecer marcar como aplicado
        const result = await Swal.fire({
            title: '¿Marcar como aplicado?',
            icon: 'question',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: 'Aplicado ✓',
            denyButtonText: 'Agregar nota',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            await marcarAdministracionAplicada(administracionId);
        } else if (result.isDenied) {
            const { value: nota } = await Swal.fire({
                title: 'Agregar nota',
                input: 'text',
                inputPlaceholder: 'Escriba una nota...',
                showCancelButton: true,
                confirmButtonText: 'Guardar'
            });
            if (nota) {
                await agregarNotaAdministracion(administracionId, nota);
            }
        }
    }
}


// ================= MONITOREO =================

async function cargarMonitoreo(hospitalizacionId) {
    const { data, error } = await supabaseClient
        .from("hospitalizacion_monitoreo")
        .select("*")
        .eq("hmon_hospitalizacion_id", hospitalizacionId);

    if (error) {
        console.error('Error cargando monitoreo:', error);
        monitoreoCache = [];
        return;
    }

    monitoreoCache = data || [];
    renderizarHojaMonitoreo();
}

async function guardarMonitoreo(hospitalizacionId, diaSemana, turno, parametros) {
    const usuario = obtenerUsuarioActual();

    const registro = {
        hmon_hospitalizacion_id: hospitalizacionId,
        hmon_dia_semana: diaSemana,
        hmon_turno: turno,
        hmon_registrado_por: usuario,
        ...parametros
    };

    const { data, error } = await supabaseClient
        .from("hospitalizacion_monitoreo")
        .upsert(registro, { onConflict: 'hmon_hospitalizacion_id,hmon_dia_semana,hmon_turno' })
        .select();

    if (error) {
        console.error('Error guardando monitoreo:', error);
        mostrarIndicadorGuardado('error');
        return;
    }

    mostrarIndicadorGuardado('guardado');

    // Actualizar cache
    if (data && data.length > 0) {
        const idx = monitoreoCache.findIndex(m =>
            m.hmon_dia_semana === diaSemana && m.hmon_turno === turno
        );
        if (idx >= 0) {
            monitoreoCache[idx] = data[0];
        } else {
            monitoreoCache.push(data[0]);
        }
    }

    aplicarAlertasVisuales();
}

function renderizarHojaMonitoreo() {
    const tbody = document.getElementById('bodyMonitoreo');
    if (!tbody) return;

    tbody.innerHTML = PARAMETROS_MONITOREO.map(param => {
        let celdas = '';

        DIAS_SEMANA.forEach(dia => {
            ['AM', 'PM'].forEach(turno => {
                const registro = monitoreoCache.find(m => m.hmon_dia_semana === dia && m.hmon_turno === turno);
                const valor = registro ? registro[param.key] : '';
                const cellId = `mon_${param.key}_${dia}_${turno}`;

                if (param.tipo === 'checkbox') {
                    const checked = valor === true ? 'checked' : '';
                    celdas += `<td><input type="checkbox" id="${cellId}" ${checked} 
                        onchange="onMonitoreoChange('${dia}', '${turno}', '${param.key}', this.checked)"></td>`;
                } else if (param.tipo === 'number') {
                    const step = param.step || '1';
                    const min = param.min || '';
                    celdas += `<td><input type="number" id="${cellId}" class="form-control form-control-sm" 
                        value="${valor !== null && valor !== undefined && valor !== '' ? valor : ''}" 
                        step="${step}" ${min ? `min="${min}"` : ''}
                        onchange="onMonitoreoChange('${dia}', '${turno}', '${param.key}', this.value)"></td>`;
                } else {
                    celdas += `<td><input type="text" id="${cellId}" class="form-control form-control-sm" 
                        value="${valor || ''}" 
                        onchange="onMonitoreoChange('${dia}', '${turno}', '${param.key}', this.value)"></td>`;
                }
            });
        });

        return `<tr><td class="parametro-label">${param.label}</td>${celdas}</tr>`;
    }).join('');

    aplicarAlertasVisuales();
}

function onMonitoreoChange(dia, turno, campo, valor) {
    if (!hospitalizacionActual) return;

    // Convertir valores numéricos
    const param = PARAMETROS_MONITOREO.find(p => p.key === campo);
    let valorFinal = valor;
    if (param && param.tipo === 'number' && valor !== '' && valor !== null) {
        valorFinal = parseFloat(valor);
    }

    // Debounce por celda
    const key = `mon_${dia}_${turno}`;
    if (debounceTimers[key]) clearTimeout(debounceTimers[key]);

    debounceTimers[key] = setTimeout(async () => {
        // Recopilar todos los valores del turno
        const parametros = {};
        PARAMETROS_MONITOREO.forEach(p => {
            const cellId = `mon_${p.key}_${dia}_${turno}`;
            const el = document.getElementById(cellId);
            if (!el) return;
            if (p.tipo === 'checkbox') {
                parametros[p.key] = el.checked;
            } else if (p.tipo === 'number') {
                parametros[p.key] = el.value !== '' ? parseFloat(el.value) : null;
            } else {
                parametros[p.key] = el.value || null;
            }
        });

        await guardarMonitoreo(hospitalizacionActual.h_id_hospitalizacion, dia, turno, parametros);
    }, 1500);

    // Aplicar alertas inmediatamente para feedback visual
    setTimeout(aplicarAlertasVisuales, 100);
}

function aplicarAlertasVisuales() {
    DIAS_SEMANA.forEach(dia => {
        ['AM', 'PM'].forEach(turno => {
            // Temperatura
            const tempEl = document.getElementById(`mon_hmon_temperatura_${dia}_${turno}`);
            if (tempEl) {
                const td = tempEl.closest('td');
                td.classList.remove('alerta-danger', 'alerta-warning');
                const val = parseFloat(tempEl.value);
                if (!isNaN(val) && (val < 37.5 || val > 39.5)) {
                    td.classList.add('alerta-danger');
                }
            }

            // Vómitos
            const vomEl = document.getElementById(`mon_hmon_vomitos_${dia}_${turno}`);
            if (vomEl) {
                const td = vomEl.closest('td');
                td.classList.remove('alerta-danger', 'alerta-warning');
                const val = parseInt(vomEl.value);
                if (!isNaN(val) && val >= 3) {
                    td.classList.add('alerta-danger');
                }
            }

            // Diarreas
            const diarrEl = document.getElementById(`mon_hmon_diarreas_${dia}_${turno}`);
            if (diarrEl) {
                const td = diarrEl.closest('td');
                td.classList.remove('alerta-danger', 'alerta-warning');
                const val = parseInt(diarrEl.value);
                if (!isNaN(val) && val >= 3) {
                    td.classList.add('alerta-danger');
                }
            }

            // Tomó agua
            const aguaEl = document.getElementById(`mon_hmon_tomo_agua_${dia}_${turno}`);
            if (aguaEl) {
                const td = aguaEl.closest('td');
                td.classList.remove('alerta-danger', 'alerta-warning');
                if (!aguaEl.checked) {
                    // Solo alertar si hay algún registro para este turno
                    const registro = monitoreoCache.find(m => m.hmon_dia_semana === dia && m.hmon_turno === turno);
                    if (registro && registro.hmon_tomo_agua === false) {
                        td.classList.add('alerta-warning');
                    }
                }
            }
        });
    });
}


// ================= OBSERVACIONES / EVOLUCIÓN =================

async function cargarObservaciones(hospitalizacionId) {
    const { data, error } = await supabaseClient
        .from("hospitalizacion_observaciones")
        .select("*")
        .eq("hobs_hospitalizacion_id", hospitalizacionId)
        .order("hobs_created_at", { ascending: true });

    if (error) {
        console.error('Error cargando observaciones:', error);
        observacionesCache = [];
        return;
    }

    observacionesCache = data || [];
    renderizarEvoluciones();
}

async function agregarObservacion(hospitalizacionId, texto, tipo) {
    const usuario = obtenerUsuarioActual();

    const { data, error } = await supabaseClient
        .from("hospitalizacion_observaciones")
        .insert([{
            hobs_hospitalizacion_id: hospitalizacionId,
            hobs_texto: texto,
            hobs_tipo: tipo,
            hobs_registrado_por: usuario
        }])
        .select();

    if (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar la observación' });
        return;
    }

    if (data && data.length > 0) {
        observacionesCache.push(data[0]);
        renderizarEvoluciones();
        Swal.fire({ icon: 'success', title: 'Guardado', text: 'Nota agregada correctamente', timer: 1200, showConfirmButton: false });
    }
}

function renderizarEvoluciones() {
    const container = document.getElementById('listaEvoluciones');
    if (!container) return;

    const evoluciones = observacionesCache.filter(o => o.hobs_tipo === 'evolucion');

    if (evoluciones.length === 0) {
        container.innerHTML = '<p class="text-muted">No hay notas de evolución registradas.</p>';
        return;
    }

    // Ordenar cronológicamente (más antigua primero)
    evoluciones.sort((a, b) => new Date(a.hobs_created_at) - new Date(b.hobs_created_at));

    container.innerHTML = evoluciones.map(nota => {
        const fecha = nota.hobs_created_at ? new Date(nota.hobs_created_at).toLocaleString('es-CO') : '';
        return `
            <div class="nota-evolucion">
                <div class="nota-meta">${fecha} - ${nota.hobs_registrado_por || 'Desconocido'}</div>
                <div class="nota-texto">${nota.hobs_texto}</div>
            </div>
        `;
    }).join('');
}

// ================= BÚSQUEDA Y FILTROS =================

function filtrarHospitalizaciones(termino) {
    if (!termino || termino.trim() === '') {
        renderizarListado(hospitalizacionesCache);
        return;
    }

    const terminoLower = termino.toLowerCase().trim();
    const filtradas = hospitalizacionesCache.filter(h => {
        const paciente = (h.datos_mascota?.dm_nombre || '').toLowerCase();
        const propietario = (h.datos_cliente?.dc_nombre || '').toLowerCase();
        return paciente.includes(terminoLower) || propietario.includes(terminoLower);
    });

    renderizarListado(filtradas);
}

function filtrarPorEstado(estado) {
    let filtradas = hospitalizacionesCache;

    if (estado && estado !== 'todas') {
        filtradas = hospitalizacionesCache.filter(h => h.h_estado === estado);
    }

    // También aplicar búsqueda si hay texto
    const inputBuscar = document.getElementById('buscarHospitalizacion');
    if (inputBuscar && inputBuscar.value.trim()) {
        const terminoLower = inputBuscar.value.toLowerCase().trim();
        filtradas = filtradas.filter(h => {
            const paciente = (h.datos_mascota?.dm_nombre || '').toLowerCase();
            const propietario = (h.datos_cliente?.dc_nombre || '').toLowerCase();
            return paciente.includes(terminoLower) || propietario.includes(terminoLower);
        });
    }

    renderizarListado(filtradas);
}

async function cargarHistorialPaciente() {
    if (!hospitalizacionActual || !hospitalizacionActual.h_mascota_id) {
        Swal.fire({ icon: 'info', title: 'Sin datos', text: 'No hay paciente asociado' });
        return;
    }

    const { data, error } = await supabaseClient
        .from("hospitalizaciones")
        .select("*")
        .eq("h_mascota_id", hospitalizacionActual.h_mascota_id)
        .neq("h_id_hospitalizacion", hospitalizacionActual.h_id_hospitalizacion)
        .order("h_fecha_ingreso", { ascending: false });

    if (error) {
        console.error('Error cargando historial:', error);
        return;
    }

    const section = document.getElementById('historialSection');
    const lista = document.getElementById('listaHistorial');
    if (!section || !lista) return;

    if (!data || data.length === 0) {
        section.style.display = 'block';
        lista.innerHTML = '<p class="text-muted">No hay hospitalizaciones previas para este paciente.</p>';
        return;
    }

    section.style.display = 'block';
    lista.innerHTML = data.map(h => `
        <div class="historial-item">
            <div class="historial-fecha">
                📅 Ingreso: ${h.h_fecha_ingreso || '-'} | Egreso: ${h.h_fecha_egreso || 'En curso'}
            </div>
            <div><strong>Estado:</strong> <span class="${h.h_estado === 'activa' ? 'badge-activa' : 'badge-finalizada'}">${h.h_estado}</span></div>
            <div><strong>Médico:</strong> ${h.h_medico_tratante || '-'}</div>
            <div><strong>Observaciones:</strong> ${h.h_observaciones || '-'}</div>
            <button class="btn btn-sm btn-outline-info mt-1" onclick="cargarFichaHospitalizacion(${h.h_id_hospitalizacion})">Ver ficha</button>
        </div>
    `).join('');
}

// ================= EXPORTACIÓN =================

function imprimirFicha() {
    window.print();
}

function exportarPDF() {
    if (typeof html2pdf === 'undefined') {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar el generador de PDF. Verifique su conexión.' });
        return;
    }

    const fichaElement = document.getElementById('vistaFicha');
    if (!fichaElement) return;

    const nombrePaciente = hospitalizacionActual?.datos_mascota?.dm_nombre || 'paciente';
    const fechaIngreso = hospitalizacionActual?.h_fecha_ingreso || 'sin-fecha';
    const nombreArchivo = `hospitalizacion_${nombrePaciente.toLowerCase().trim().replace(/\s+/g, '_')}_${fechaIngreso}.pdf`;

    const opciones = {
        margin: [10, 10, 10, 10],
        filename: nombreArchivo,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    // Temporalmente mostrar ambos paneles para el PDF
    const panelMonitoreo = document.getElementById('panelMonitoreo');
    const panelFicha = document.getElementById('panelFicha');
    const originalMonitoreoClass = panelMonitoreo?.className;
    const originalFichaClass = panelFicha?.className;

    if (panelMonitoreo) panelMonitoreo.className = 'tab-pane fade show active';
    if (panelFicha) panelFicha.className = 'tab-pane fade show active';

    html2pdf().set(opciones).from(fichaElement).save().then(() => {
        // Restaurar clases originales
        if (panelMonitoreo) panelMonitoreo.className = originalMonitoreoClass;
        if (panelFicha) panelFicha.className = originalFichaClass;
        Swal.fire({ icon: 'success', title: 'PDF generado', text: `Archivo: ${nombreArchivo}`, timer: 2000, showConfirmButton: false });
    }).catch(err => {
        if (panelMonitoreo) panelMonitoreo.className = originalMonitoreoClass;
        if (panelFicha) panelFicha.className = originalFichaClass;
        console.error('Error generando PDF:', err);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Error al generar PDF. Intente nuevamente.' });
    });
}

// ================= MODO LECTURA Y SEGURIDAD =================

function configurarModoLectura(soloLectura) {
    const ficha = document.getElementById('vistaFicha');
    if (!ficha) return;

    // Inputs, textareas, selects
    ficha.querySelectorAll('input, textarea, select').forEach(el => {
        if (soloLectura) {
            el.setAttribute('disabled', 'disabled');
        } else {
            el.removeAttribute('disabled');
        }
    });

    // Botones de acción (agregar, eliminar, duplicar, finalizar)
    const botonesOcultar = [
        'btnAgregarMedicamento',
        'btnAgregarEvolucion',
        'btnGuardarObsMonitoreo',
        'btnFinalizar'
    ];

    botonesOcultar.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.style.display = soloLectura ? 'none' : '';
    });

    // Botones de acción en medicamentos
    ficha.querySelectorAll('.btn-accion-med').forEach(btn => {
        btn.style.display = soloLectura ? 'none' : '';
    });

    // Celdas de día (deshabilitar click)
    ficha.querySelectorAll('.celda-dia').forEach(celda => {
        if (soloLectura) {
            celda.style.pointerEvents = 'none';
            celda.style.cursor = 'default';
        } else {
            celda.style.pointerEvents = '';
            celda.style.cursor = 'pointer';
        }
    });

    // Textarea de nueva evolución
    const nuevaEvolucion = document.getElementById('nuevaEvolucion');
    if (nuevaEvolucion) {
        if (soloLectura) {
            nuevaEvolucion.setAttribute('disabled', 'disabled');
        } else {
            nuevaEvolucion.removeAttribute('disabled');
        }
    }

    // Textarea observación monitoreo
    const obsMonitoreo = document.getElementById('observacionMonitoreo');
    if (obsMonitoreo) {
        if (soloLectura) {
            obsMonitoreo.setAttribute('disabled', 'disabled');
        } else {
            obsMonitoreo.removeAttribute('disabled');
        }
    }
}
