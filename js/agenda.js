// ================= CONFIG =================

const SUPABASE_URL = "https://nlqtzidfowoxylporidi.supabase.co";
const SUPABASE_KEY = "sb_publishable_Qe7khKcVgFoN1KpXydGbcA_mEddQQNi";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// ================= GLOBAL STATE =================

let calendarInstance = null;
let tiposCitaCache = [];
let estadosCitaCache = [];
let veterinariosCache = [];
let clientesCache = [];

// Transiciones de estado permitidas
// 1=Programada, 2=Confirmada, 3=Cancelada, 4=Generar Consulta, 5=Finalizada, 6=No asistió
const TRANSICIONES_ESTADO = {
    1: [2, 3],       // Programada → Confirmada, Cancelada
    2: [4, 3, 6],    // Confirmada → Generar Consulta, Cancelada, No asistió
    4: [5]            // Generar Consulta → Finalizada
};

const COLORES_ESTADO = {
    1: '#007bff',  // Programada - Azul
    2: '#28a745',  // Confirmada - Verde
    3: '#dc3545',  // Cancelada - Rojo
    4: '#ffc107',  // Generar Consulta - Amarillo
    5: '#6c757d',  // Finalizada - Gris
    6: '#fd7e14'   // No asistió - Naranja
};

const NOMBRES_ESTADO = {
    1: 'Programada',
    2: 'Confirmada',
    3: 'Cancelada',
    4: 'Generar Consulta',
    5: 'Finalizada',
    6: 'No asistió'
};

// ================= INITIALIZATION =================

document.addEventListener("DOMContentLoaded", async () => {
    await cargarTiposCita();
    await cargarEstadosCita();
    await cargarVeterinarios();
    await cargarClientes();
    inicializarCalendario();
    inicializarEventListeners();
    actualizarResumenDia();
});

// ================= LOAD REFERENCE DATA =================

async function cargarTiposCita() {
    const { data, error } = await supabaseClient
        .from("tipo_cita")
        .select("*")
        .order("tc_nombre");

    if (error) {
        console.error("Error cargando tipos de cita:", error.message);
        return;
    }

    tiposCitaCache = data || [];

    // Populate filter select
    const filtroSelect = document.getElementById("filtroTipoCita");
    filtroSelect.innerHTML = '<option value="">Todos los tipos</option>';
    tiposCitaCache.forEach(tc => {
        const opt = document.createElement("option");
        opt.value = tc.tc_id_tipo_cita;
        opt.textContent = tc.tc_nombre;
        filtroSelect.appendChild(opt);
    });

    // Populate form select
    const formSelect = document.getElementById("ct_tc_id_tipo_cita");
    formSelect.innerHTML = '<option value="">Seleccione</option>';
    tiposCitaCache.forEach(tc => {
        const opt = document.createElement("option");
        opt.value = tc.tc_id_tipo_cita;
        opt.textContent = `${tc.tc_nombre} (${tc.tc_duracion_minutos} min)`;
        formSelect.appendChild(opt);
    });

    // Populate tipo cita config modal vet select
    const tcVetSelect = document.getElementById("tc_pv_documento");
    tcVetSelect.innerHTML = '<option value="">Ninguno</option>';
}

async function cargarEstadosCita() {
    const { data, error } = await supabaseClient
        .from("estado_cita")
        .select("*")
        .order("eci_id_estado_cita");

    if (error) {
        console.error("Error cargando estados de cita:", error.message);
        return;
    }

    estadosCitaCache = data || [];

    // Populate filter select
    const filtroSelect = document.getElementById("filtroEstadoCita");
    filtroSelect.innerHTML = '<option value="">Todos los estados</option>';
    estadosCitaCache.forEach(ec => {
        const opt = document.createElement("option");
        opt.value = ec.eci_id_estado_cita;
        opt.textContent = ec.eci_estado;
        filtroSelect.appendChild(opt);
    });

    // Populate historial estado select
    const historialEstado = document.getElementById("historial_estado");
    historialEstado.innerHTML = '<option value="">Todos los estados</option>';
    estadosCitaCache.forEach(ec => {
        const opt = document.createElement("option");
        opt.value = ec.eci_id_estado_cita;
        opt.textContent = ec.eci_estado;
        historialEstado.appendChild(opt);
    });
}

async function cargarVeterinarios() {
    const { data, error } = await supabaseClient
        .from("personal_vet")
        .select("pv_documento, pv_primer_nombre, pv_primer_apellido")
        .order("pv_primer_nombre");

    if (error) {
        console.error("Error cargando veterinarios:", error.message);
        return;
    }

    veterinariosCache = data || [];

    const selects = [
        "filtroVeterinario",
        "ct_pv_documento",
        "horario_veterinario_select",
        "bh_pv_documento",
        "tc_pv_documento"
    ];

    const defaultOptions = {
        "filtroVeterinario": '<option value="">Todos los veterinarios</option>',
        "ct_pv_documento": '<option value="">Seleccione</option>',
        "horario_veterinario_select": '<option value="">Seleccione un veterinario</option>',
        "bh_pv_documento": '<option value="">Todos los veterinarios</option>',
        "tc_pv_documento": '<option value="">Ninguno</option>'
    };

    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;
        select.innerHTML = defaultOptions[selectId] || '<option value="">Seleccione</option>';
        veterinariosCache.forEach(vet => {
            const opt = document.createElement("option");
            opt.value = vet.pv_documento;
            opt.textContent = `${vet.pv_primer_nombre} ${vet.pv_primer_apellido}`;
            select.appendChild(opt);
        });
    });
}

async function cargarClientes() {
    const { data, error } = await supabaseClient
        .from("datos_cliente")
        .select("dc_id_cliente, dc_nombre, dc_identificacion")
        .order("dc_nombre");

    if (error) {
        console.error("Error cargando clientes:", error.message);
        return;
    }

    clientesCache = data || [];

    // Populate form select
    const formSelect = document.getElementById("ct_dc_id_cliente");
    formSelect.innerHTML = '<option value="">Seleccione un cliente</option>';
    clientesCache.forEach(cl => {
        const opt = document.createElement("option");
        opt.value = cl.dc_id_cliente;
        opt.textContent = `${cl.dc_nombre} (${cl.dc_identificacion})`;
        formSelect.appendChild(opt);
    });

    // Populate historial cliente select
    const historialCliente = document.getElementById("historial_cliente");
    historialCliente.innerHTML = '<option value="">Todos los clientes</option>';
    clientesCache.forEach(cl => {
        const opt = document.createElement("option");
        opt.value = cl.dc_id_cliente;
        opt.textContent = `${cl.dc_nombre} (${cl.dc_identificacion})`;
        historialCliente.appendChild(opt);
    });
}


// ================= FULLCALENDAR SETUP =================

function inicializarCalendario() {
    const calendarEl = document.getElementById("calendar");

    calendarInstance = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek',
        locale: 'es',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'timeGridDay,timeGridWeek,dayGridMonth'
        },
        slotMinTime: '06:00:00',
        slotMaxTime: '23:59:00',
        slotDuration: '00:30:00',
        allDaySlot: true,
        editable: true,
        selectable: true,
        navLinks: true,
        hiddenDays: [0], // Hide Sundays
        events: fetchEventos,
        eventClick: onEventClick,
        dateClick: onDateClick,
        eventDrop: onEventDrop,
        datesSet: onDatesSet,
        eventDidMount: function (info) {
            if (info.event.extendedProps.tipo === 'cita') {
                const estado = info.event.extendedProps.ct_eci_id_estado_cita;
                const estadoNombre = NOMBRES_ESTADO[estado] || '';
                info.el.title = `${info.event.title}\nEstado: ${estadoNombre}`;
            }
        }
    });

    calendarInstance.render();
}

async function fetchEventos(fetchInfo, successCallback, failureCallback) {
    try {
        const startDate = fetchInfo.startStr.split('T')[0];
        const endDate = fetchInfo.endStr.split('T')[0];

        // Get active filters
        const filtroVet = document.getElementById("filtroVeterinario").value;
        const filtroTipo = document.getElementById("filtroTipoCita").value;
        const filtroEstado = document.getElementById("filtroEstadoCita").value;

        // Fetch citas
        let citasQuery = supabaseClient
            .from("citas")
            .select(`
                *,
                tipo_cita ( tc_id_tipo_cita, tc_nombre, tc_color, tc_duracion_minutos ),
                estado_cita ( eci_id_estado_cita, eci_estado, eci_color ),
                datos_cliente ( dc_id_cliente, dc_nombre ),
                datos_mascota ( dm_id_mascota, dm_nombre ),
                personal_vet ( pv_documento, pv_primer_nombre, pv_primer_apellido )
            `)
            .gte("ct_fecha", startDate)
            .lte("ct_fecha", endDate);

        if (filtroVet) {
            citasQuery = citasQuery.eq("ct_pv_documento", parseInt(filtroVet));
        }
        if (filtroTipo) {
            citasQuery = citasQuery.eq("ct_tc_id_tipo_cita", parseInt(filtroTipo));
        }
        if (filtroEstado) {
            citasQuery = citasQuery.eq("ct_eci_id_estado_cita", parseInt(filtroEstado));
        }

        const { data: citas, error: errCitas } = await citasQuery;
        if (errCitas) {
            console.error("Error cargando citas:", errCitas.message);
            failureCallback(errCitas);
            return;
        }

        // Fetch bloqueos
        let bloqueosQuery = supabaseClient
            .from("bloqueo_horario")
            .select("*")
            .gte("bh_fecha", startDate)
            .lte("bh_fecha", endDate);

        if (filtroVet) {
            bloqueosQuery = bloqueosQuery.or(`bh_pv_documento.eq.${parseInt(filtroVet)},bh_pv_documento.is.null`);
        }

        const { data: bloqueos, error: errBloqueos } = await bloqueosQuery;
        if (errBloqueos) {
            console.error("Error cargando bloqueos:", errBloqueos.message);
        }

        // Fetch días no laborales
        const { data: diasNoLaborales, error: errDNL } = await supabaseClient
            .from("dia_no_laboral")
            .select("*")
            .gte("dnl_fecha", startDate)
            .lte("dnl_fecha", endDate);

        if (errDNL) {
            console.error("Error cargando días no laborales:", errDNL.message);
        }

        // Map citas to FC events
        const eventosCitas = (citas || []).map(cita => {
            const mascotaNombre = cita.datos_mascota ? cita.datos_mascota.dm_nombre : 'Sin mascota';
            const clienteNombre = cita.datos_cliente ? cita.datos_cliente.dc_nombre : 'Sin cliente';
            const color = cita.tipo_cita ? cita.tipo_cita.tc_color : '#007bff';

            return {
                id: `cita-${cita.ct_id_cita}`,
                title: `${mascotaNombre} - ${clienteNombre}`,
                start: `${cita.ct_fecha}T${cita.ct_hora_inicio}`,
                end: `${cita.ct_fecha}T${cita.ct_hora_fin}`,
                backgroundColor: color,
                borderColor: color,
                extendedProps: {
                    tipo: 'cita',
                    citaId: cita.ct_id_cita,
                    ...cita
                }
            };
        });

        // Map bloqueos to FC events
        const eventosBloqueos = (bloqueos || []).map(bloqueo => ({
            id: `bloqueo-${bloqueo.bh_id_bloqueo}`,
            title: `🔒 ${bloqueo.bh_motivo}`,
            start: `${bloqueo.bh_fecha}T${bloqueo.bh_hora_inicio}`,
            end: `${bloqueo.bh_fecha}T${bloqueo.bh_hora_fin}`,
            backgroundColor: '#6c757d',
            borderColor: '#6c757d',
            display: 'background',
            extendedProps: {
                tipo: 'bloqueo',
                bloqueoId: bloqueo.bh_id_bloqueo,
                ...bloqueo
            }
        }));

        // Map días no laborales to FC events
        const eventosDNL = (diasNoLaborales || []).map(dnl => ({
            id: `dnl-${dnl.dnl_id_dia}`,
            title: `🚫 ${dnl.dnl_descripcion}`,
            start: dnl.dnl_fecha,
            allDay: true,
            backgroundColor: '#dc3545',
            borderColor: '#dc3545',
            display: 'background',
            extendedProps: {
                tipo: 'dia_no_laboral',
                ...dnl
            }
        }));

        successCallback([...eventosCitas, ...eventosBloqueos, ...eventosDNL]);
    } catch (err) {
        console.error("Error en fetchEventos:", err);
        failureCallback(err);
    }
}

function onDateClick(info) {
    Swal.fire({
        title: '¿Qué desea crear?',
        icon: 'question',
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: 'Nueva Cita',
        denyButtonText: 'Bloquear Horario',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#28a745',
        denyButtonColor: '#6c757d'
    }).then((result) => {
        if (result.isConfirmed) {
            // Open new appointment modal with pre-filled date/time
            document.getElementById("ct_id_cita").value = "";
            document.getElementById("formCita").reset();
            document.getElementById("ct_dm_id_mascota").innerHTML = '<option value="">Seleccione primero un cliente</option>';
            document.getElementById("ct_dm_id_mascota").disabled = true;
            document.getElementById("ct_hora_inicio").innerHTML = '<option value="">Seleccione veterinario y fecha</option>';
            document.getElementById("ct_hora_inicio").disabled = true;
            document.getElementById("ct_hora_fin_display").textContent = '--:--';
            document.getElementById("modalCitaLabel").textContent = "Nueva Cita";

            // Pre-fill date
            if (info.dateStr) {
                const dateStr = info.dateStr.includes('T') ? info.dateStr.split('T')[0] : info.dateStr;
                document.getElementById("ct_fecha").value = dateStr;
            }

            $('#modalCita').modal('show');
        } else if (result.isDenied) {
            // Open block modal with pre-filled date/time
            document.getElementById("formBloqueo").reset();
            if (info.dateStr) {
                const dateStr = info.dateStr.includes('T') ? info.dateStr.split('T')[0] : info.dateStr;
                document.getElementById("bh_fecha").value = dateStr;

                if (info.dateStr.includes('T')) {
                    const timeStr = info.dateStr.split('T')[1].substring(0, 5);
                    document.getElementById("bh_hora_inicio").value = timeStr;
                    // Set end time 1 hour later
                    const [h, m] = timeStr.split(':').map(Number);
                    const endH = Math.min(h + 1, 21);
                    document.getElementById("bh_hora_fin").value = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                }
            }
            $('#modalBloqueo').modal('show');
        }
    });
}

async function onEventClick(info) {
    const event = info.event;
    const props = event.extendedProps;

    if (props.tipo === 'cita') {
        await mostrarDetalleCita(props.citaId);
    } else if (props.tipo === 'bloqueo') {
        const result = await Swal.fire({
            title: '¿Eliminar este bloqueo?',
            text: `🔒 ${props.bh_motivo}\nLa franja horaria quedará disponible para nuevas citas.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            await eliminarBloqueo(props.bloqueoId);
        }
    }
}

async function onEventDrop(info) {
    const event = info.event;
    const props = event.extendedProps;

    if (props.tipo !== 'cita') {
        info.revert();
        return;
    }

    const estadoActual = props.ct_eci_id_estado_cita;

    // Only allow reprogramming for Programada (1) or Confirmada (2)
    if (estadoActual !== 1 && estadoActual !== 2) {
        await Swal.fire({
            title: 'No se puede reprogramar',
            text: 'Solo se pueden reprogramar citas en estado Programada o Confirmada.',
            icon: 'warning'
        });
        info.revert();
        return;
    }

    const newStart = event.start;
    const newEnd = event.end;
    const newFecha = newStart.toISOString().split('T')[0];
    const newHoraInicio = newStart.toTimeString().substring(0, 5);
    const newHoraFin = newEnd ? newEnd.toTimeString().substring(0, 5) : calcularHoraFin(newHoraInicio, props.tipo_cita ? props.tipo_cita.tc_duracion_minutos : 30);

    // Verify availability
    const conflicto = await verificarDisponibilidad(
        props.ct_pv_documento,
        newFecha,
        newHoraInicio,
        newHoraFin,
        props.ct_id_cita
    );

    if (conflicto) {
        await Swal.fire({
            title: 'Horario no disponible',
            text: 'Existe un conflicto con otra cita en ese horario.',
            icon: 'info'
        });
        info.revert();
        return;
    }

    // Save original date/time and update
    const updateData = {
        ct_fecha: newFecha,
        ct_hora_inicio: newHoraInicio,
        ct_hora_fin: newHoraFin,
        ct_fecha_original: props.ct_fecha,
        ct_hora_original: props.ct_hora_inicio
    };

    const { error } = await supabaseClient
        .from("citas")
        .update(updateData)
        .eq("ct_id_cita", props.ct_id_cita);

    if (error) {
        await Swal.fire({ title: "Error", text: error.message, icon: "error" });
        info.revert();
        return;
    }

    await Swal.fire({
        title: 'Cita reprogramada',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
    });

    calendarInstance.refetchEvents();
    actualizarResumenDia();
}

function onDatesSet(info) {
    actualizarResumenDia();
}


// ================= CRUD CITAS =================

async function cargarMascotasPorCliente(clienteId) {
    const mascotaSelect = document.getElementById("ct_dm_id_mascota");

    if (!clienteId) {
        mascotaSelect.innerHTML = '<option value="">Seleccione primero un cliente</option>';
        mascotaSelect.disabled = true;
        return;
    }

    const { data, error } = await supabaseClient
        .from("datos_mascota")
        .select("dm_id_mascota, dm_nombre, dm_especie, dm_raza")
        .eq("dm_dc_id_cliente", parseInt(clienteId))
        .order("dm_nombre");

    if (error) {
        console.error("Error cargando mascotas:", error.message);
        return;
    }

    mascotaSelect.innerHTML = '<option value="">Seleccione una mascota</option>';
    (data || []).forEach(m => {
        const opt = document.createElement("option");
        opt.value = m.dm_id_mascota;
        opt.textContent = `${m.dm_nombre} (${m.dm_especie} - ${m.dm_raza})`;
        mascotaSelect.appendChild(opt);
    });
    mascotaSelect.disabled = false;
}

async function cargarSlotsDisponibles() {
    const vetDoc = document.getElementById("ct_pv_documento").value;
    const fecha = document.getElementById("ct_fecha").value;
    const tipoId = document.getElementById("ct_tc_id_tipo_cita").value;
    const horaSelect = document.getElementById("ct_hora_inicio");

    if (!vetDoc || !fecha || !tipoId) {
        horaSelect.innerHTML = '<option value="">Seleccione veterinario y fecha</option>';
        horaSelect.disabled = true;
        return;
    }

    const tipoCita = tiposCitaCache.find(tc => tc.tc_id_tipo_cita === parseInt(tipoId));
    const duracion = tipoCita ? tipoCita.tc_duracion_minutos : 30;

    const slots = await calcularSlotsDisponibles(parseInt(vetDoc), fecha, duracion);

    horaSelect.innerHTML = '<option value="">Seleccione una hora</option>';

    if (slots.length === 0) {
        horaSelect.innerHTML = '<option value="">No hay horarios disponibles</option>';
        horaSelect.disabled = true;
        return;
    }

    slots.forEach(slot => {
        const opt = document.createElement("option");
        opt.value = slot.horaInicio;
        opt.textContent = `${slot.horaInicio} - ${slot.horaFin}`;
        horaSelect.appendChild(opt);
    });
    horaSelect.disabled = false;
}

function actualizarHoraFin() {
    const horaInicio = document.getElementById("ct_hora_inicio").value;
    const tipoId = document.getElementById("ct_tc_id_tipo_cita").value;
    const display = document.getElementById("ct_hora_fin_display");

    if (!horaInicio || !tipoId) {
        display.textContent = '--:--';
        return;
    }

    const tipoCita = tiposCitaCache.find(tc => tc.tc_id_tipo_cita === parseInt(tipoId));
    const duracion = tipoCita ? tipoCita.tc_duracion_minutos : 30;
    const horaFin = calcularHoraFin(horaInicio, duracion);

    display.textContent = horaFin || '--:--';
}

async function guardarCita(e) {
    e.preventDefault();

    const idCita = document.getElementById("ct_id_cita").value;

    // Validate required fields
    const campos = ['ct_dc_id_cliente', 'ct_dm_id_mascota', 'ct_tc_id_tipo_cita', 'ct_pv_documento', 'ct_fecha', 'ct_hora_inicio'];
    let valido = true;
    campos.forEach(id => {
        const el = document.getElementById(id);
        if (!el.value || !el.value.trim()) {
            el.classList.add('is-invalid');
            valido = false;
        } else {
            el.classList.remove('is-invalid');
        }
    });

    if (!valido) {
        await Swal.fire({
            title: "Campos incompletos",
            text: "Por favor complete todos los campos obligatorios.",
            icon: "warning"
        });
        return;
    }

    const tipoId = parseInt(document.getElementById("ct_tc_id_tipo_cita").value);
    const tipoCita = tiposCitaCache.find(tc => tc.tc_id_tipo_cita === tipoId);
    const duracion = tipoCita ? tipoCita.tc_duracion_minutos : 30;
    const horaInicio = document.getElementById("ct_hora_inicio").value;
    const horaFin = calcularHoraFin(horaInicio, duracion);

    if (!horaFin) {
        await Swal.fire({
            title: "Error",
            text: "La hora de fin excede el horario permitido.",
            icon: "error"
        });
        return;
    }

    const citaData = {
        ct_dc_id_cliente: parseInt(document.getElementById("ct_dc_id_cliente").value),
        ct_dm_id_mascota: parseInt(document.getElementById("ct_dm_id_mascota").value),
        ct_tc_id_tipo_cita: tipoId,
        ct_pv_documento: parseInt(document.getElementById("ct_pv_documento").value),
        ct_fecha: document.getElementById("ct_fecha").value,
        ct_hora_inicio: horaInicio,
        ct_hora_fin: horaFin,
        ct_notas: document.getElementById("ct_notas").value.trim() || null
    };

    if (idCita) {
        await actualizarCita(parseInt(idCita), citaData);
    } else {
        await crearCitaConVerificacion(citaData);
    }
}

async function crearCitaConVerificacion(citaData) {
    // Check connection
    if (!navigator.onLine) {
        await Swal.fire({
            title: "Sin conexión",
            text: "No se pudo conectar al servidor. Verifique su conexión a internet.",
            icon: "warning"
        });
        return;
    }

    // Verify availability just before insert
    const conflicto = await verificarDisponibilidad(
        citaData.ct_pv_documento,
        citaData.ct_fecha,
        citaData.ct_hora_inicio,
        citaData.ct_hora_fin
    );

    if (conflicto) {
        await Swal.fire({
            title: "Horario no disponible",
            text: "Otro usuario reservó este horario. Se recargarán los horarios disponibles.",
            icon: "info"
        });
        await cargarSlotsDisponibles();
        return;
    }

    // Default state: Programada (1)
    citaData.ct_eci_id_estado_cita = 1;

    const { data, error } = await supabaseClient
        .from("citas")
        .insert(citaData)
        .select()
        .single();

    if (error) {
        manejarErrorSupabase(error);
        return;
    }

    await Swal.fire({
        title: "Cita registrada",
        text: "La cita ha sido programada exitosamente.",
        icon: "success",
        timer: 2000,
        showConfirmButton: false
    });

    $('#modalCita').modal('hide');
    document.getElementById("formCita").reset();
    calendarInstance.refetchEvents();
    actualizarResumenDia();
}

async function actualizarCita(id, citaData) {
    const { error } = await supabaseClient
        .from("citas")
        .update(citaData)
        .eq("ct_id_cita", id);

    if (error) {
        manejarErrorSupabase(error);
        return;
    }

    await Swal.fire({
        title: "Cita actualizada",
        icon: "success",
        timer: 2000,
        showConfirmButton: false
    });

    $('#modalCita').modal('hide');
    document.getElementById("formCita").reset();
    calendarInstance.refetchEvents();
    actualizarResumenDia();
}

async function cambiarEstadoCita(citaId, nuevoEstado) {
    // Fetch current state
    const { data: cita, error: errFetch } = await supabaseClient
        .from("citas")
        .select("ct_eci_id_estado_cita")
        .eq("ct_id_cita", citaId)
        .single();

    if (errFetch || !cita) {
        await Swal.fire({ title: "Error", text: "No se pudo obtener la cita.", icon: "error" });
        return;
    }

    const estadoActual = cita.ct_eci_id_estado_cita;
    const transicionesPermitidas = TRANSICIONES_ESTADO[estadoActual] || [];

    if (!transicionesPermitidas.includes(nuevoEstado)) {
        const nombresValidos = transicionesPermitidas.map(e => NOMBRES_ESTADO[e]).join(', ');
        await Swal.fire({
            title: "Transición no permitida",
            text: `No se puede cambiar de ${NOMBRES_ESTADO[estadoActual]} a ${NOMBRES_ESTADO[nuevoEstado]}. Transiciones válidas: ${nombresValidos || 'ninguna'}`,
            icon: "warning"
        });
        return;
    }

    // If cancelling, confirm
    if (nuevoEstado === 3) {
        const result = await Swal.fire({
            title: "¿Cancelar esta cita?",
            text: "Se liberará el horario para nuevas reservas.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#28a745",
            cancelButtonColor: "#d33",
            confirmButtonText: "Sí, cancelar cita",
            cancelButtonText: "No, mantener"
        });
        if (!result.isConfirmed) return;
    }

    const { error } = await supabaseClient
        .from("citas")
        .update({ ct_eci_id_estado_cita: nuevoEstado })
        .eq("ct_id_cita", citaId);

    if (error) {
        await Swal.fire({ title: "Error", text: error.message, icon: "error" });
        return;
    }

    await Swal.fire({
        title: `Estado cambiado a ${NOMBRES_ESTADO[nuevoEstado]}`,
        icon: "success",
        timer: 2000,
        showConfirmButton: false
    });

    // If Finalizada, offer to create consulta médica
    if (nuevoEstado === 5) {
        await ofrecerCrearConsulta(citaId);
    }

    calendarInstance.refetchEvents();
    actualizarResumenDia();

    // Refresh detail modal if open
    $('#modalDetalleCita').modal('hide');
}


// ================= SLOT AVAILABILITY =================

/**
 * Calculate available time slots for a veterinarian on a given date.
 * @param {number} vetDoc - Veterinarian document number
 * @param {string} fecha - Date string (YYYY-MM-DD)
 * @param {number} duracionMin - Duration in minutes
 * @returns {Array<{horaInicio: string, horaFin: string}>}
 */
async function calcularSlotsDisponibles(vetDoc, fecha, duracionMin) {
    // 1. Check if it's a non-working day
    const { data: dnlData } = await supabaseClient
        .from("dia_no_laboral")
        .select("dnl_id_dia")
        .eq("dnl_fecha", fecha);

    if (dnlData && dnlData.length > 0) {
        return [];
    }

    // 2. Get day of week: JS Date.getDay() → 0=Sunday...6=Saturday
    //    DB uses: 1=Monday...6=Saturday (0=Sunday not used since hiddenDays)
    const dateObj = new Date(fecha + 'T12:00:00'); // Use noon to avoid timezone issues
    const jsDow = dateObj.getDay(); // 0=Sun, 1=Mon...6=Sat

    // Map JS day to DB day: JS 1=Mon→DB 1, JS 2=Tue→DB 2, ..., JS 6=Sat→DB 6, JS 0=Sun→DB 0
    const dbDow = jsDow; // They match: 0=Sunday, 1=Monday...6=Saturday

    // 3. Get horario for that day
    const { data: horarioData } = await supabaseClient
        .from("horario_veterinario")
        .select("*")
        .eq("hv_pv_documento", vetDoc)
        .eq("hv_dia_semana", dbDow)
        .single();

    if (!horarioData) {
        return [];
    }

    const horarioInicio = horarioData.hv_hora_inicio.substring(0, 5);
    const horarioFin = horarioData.hv_hora_fin.substring(0, 5);
    const bufferMin = horarioData.hv_buffer_minutos || 0;

    // 4. Get existing citas (estado Programada=1 or Confirmada=2) for vet+date
    const { data: citasExistentes } = await supabaseClient
        .from("citas")
        .select("ct_hora_inicio, ct_hora_fin")
        .eq("ct_pv_documento", vetDoc)
        .eq("ct_fecha", fecha)
        .in("ct_eci_id_estado_cita", [1, 2]);

    // 5. Get bloqueos for vet+date (include null vet = all)
    const { data: bloqueosData } = await supabaseClient
        .from("bloqueo_horario")
        .select("bh_hora_inicio, bh_hora_fin")
        .eq("bh_fecha", fecha)
        .or(`bh_pv_documento.eq.${vetDoc},bh_pv_documento.is.null`);

    // 6. Generate 30-min slots from horario inicio to horario fin
    const slots = [];
    let currentSlot = horarioInicio;

    while (currentSlot < horarioFin) {
        const slotFin = sumarMinutos(currentSlot, duracionMin);

        // Check slot doesn't exceed horario fin
        if (!slotFin || slotFin > horarioFin) {
            break;
        }

        // Check no overlap with existing citas (considering buffer)
        let conflicto = false;

        if (citasExistentes) {
            for (const cita of citasExistentes) {
                const citaInicio = cita.ct_hora_inicio.substring(0, 5);
                const citaFin = cita.ct_hora_fin.substring(0, 5);
                if (detectarSuperposicion(currentSlot, slotFin, citaInicio, citaFin, bufferMin)) {
                    conflicto = true;
                    break;
                }
            }
        }

        // Check no overlap with bloqueos
        if (!conflicto && bloqueosData) {
            for (const bloqueo of bloqueosData) {
                const bloqueoInicio = bloqueo.bh_hora_inicio.substring(0, 5);
                const bloqueoFin = bloqueo.bh_hora_fin.substring(0, 5);
                if (detectarSuperposicion(currentSlot, slotFin, bloqueoInicio, bloqueoFin, 0)) {
                    conflicto = true;
                    break;
                }
            }
        }

        if (!conflicto) {
            slots.push({ horaInicio: currentSlot, horaFin: slotFin });
        }

        // Move to next 30-min slot
        currentSlot = sumarMinutos(currentSlot, 30);
    }

    return slots;
}

/**
 * Detect overlap between two time intervals considering a buffer.
 * Returns true if intervals [a1, a2) and [b1, b2) overlap with buffer.
 * With buffer: a1 < b2 + buffer AND b1 < a2 + buffer (in minutes)
 */
function detectarSuperposicion(a1, a2, b1, b2, bufferMin) {
    const a1Min = horaAMinutos(a1);
    const a2Min = horaAMinutos(a2);
    const b1Min = horaAMinutos(b1);
    const b2Min = horaAMinutos(b2);

    return a1Min < (b2Min + bufferMin) && b1Min < (a2Min + bufferMin);
}

/**
 * Verify if there's a scheduling conflict for a vet at a given date/time.
 * @param {number} vetDoc
 * @param {string} fecha
 * @param {string} horaInicio
 * @param {string} horaFin
 * @param {number|null} excludeCitaId - Exclude this cita from conflict check (for updates)
 * @returns {boolean} true if there's a conflict
 */
async function verificarDisponibilidad(vetDoc, fecha, horaInicio, horaFin, excludeCitaId = null) {
    let query = supabaseClient
        .from("citas")
        .select("ct_id_cita")
        .eq("ct_pv_documento", vetDoc)
        .eq("ct_fecha", fecha)
        .in("ct_eci_id_estado_cita", [1, 2])
        .lt("ct_hora_inicio", horaFin)
        .gt("ct_hora_fin", horaInicio);

    if (excludeCitaId) {
        query = query.neq("ct_id_cita", excludeCitaId);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error verificando disponibilidad:", error.message);
        return true; // Assume conflict on error
    }

    return data && data.length > 0;
}

// ================= TIME UTILITIES =================

/**
 * Convert "HH:MM" to total minutes.
 */
function horaAMinutos(hora) {
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m;
}

/**
 * Convert total minutes to "HH:MM".
 */
function minutosAHora(minutos) {
    if (minutos >= 1440) return null; // Exceeds 24:00
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Add minutes to a time string "HH:MM".
 * Returns null if result exceeds 24:00.
 */
function sumarMinutos(hora, minutos) {
    const totalMin = horaAMinutos(hora) + minutos;
    return minutosAHora(totalMin);
}

/**
 * Calculate end time from start time and duration.
 */
function calcularHoraFin(horaInicio, duracionMin) {
    return sumarMinutos(horaInicio, duracionMin);
}


// ================= FILTERS & PANEL =================

function aplicarFiltros() {
    if (calendarInstance) {
        calendarInstance.refetchEvents();
    }
}

function limpiarFiltros() {
    document.getElementById("filtroVeterinario").value = "";
    document.getElementById("filtroTipoCita").value = "";
    document.getElementById("filtroEstadoCita").value = "";
    if (calendarInstance) {
        calendarInstance.refetchEvents();
    }
}

async function actualizarResumenDia() {
    const hoy = new Date().toISOString().split('T')[0];

    const { data: citasHoy, error } = await supabaseClient
        .from("citas")
        .select(`
            *,
            tipo_cita ( tc_nombre, tc_color ),
            estado_cita ( eci_estado, eci_color ),
            datos_cliente ( dc_nombre ),
            datos_mascota ( dm_nombre ),
            personal_vet ( pv_primer_nombre, pv_primer_apellido )
        `)
        .eq("ct_fecha", hoy)
        .order("ct_hora_inicio");

    if (error) {
        console.error("Error cargando resumen del día:", error.message);
        return;
    }

    const citas = citasHoy || [];

    // Count total citas today
    document.getElementById("countCitasHoy").textContent = citas.length;

    // Count pending (Programada = 1)
    const pendientes = citas.filter(c => c.ct_eci_id_estado_cita === 1);
    document.getElementById("countPendientes").textContent = pendientes.length;

    // Find next appointment (Programada or Confirmada, hora_inicio > now)
    const ahora = new Date();
    const horaActual = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;

    const proximaCita = citas.find(c =>
        (c.ct_eci_id_estado_cita === 1 || c.ct_eci_id_estado_cita === 2) &&
        c.ct_hora_inicio.substring(0, 5) > horaActual
    );

    const proximaInfo = document.getElementById("proximaCitaInfo");
    if (proximaCita) {
        const clienteNombre = proximaCita.datos_cliente ? proximaCita.datos_cliente.dc_nombre : 'N/A';
        const mascotaNombre = proximaCita.datos_mascota ? proximaCita.datos_mascota.dm_nombre : 'N/A';
        proximaInfo.innerHTML = `
            <strong>Próxima:</strong> ${proximaCita.ct_hora_inicio.substring(0, 5)}<br>
            ${clienteNombre} - ${mascotaNombre}
        `;
    } else {
        proximaInfo.textContent = 'Sin citas próximas';
    }

    // Check 30-min alert
    verificarAlertaProxima(citas, horaActual);

    // Render day cards
    renderizarCitasDelDia(citas);
}

function verificarAlertaProxima(citas, horaActual) {
    const alertaEl = document.getElementById("alertaProxima");
    const alertaTexto = document.getElementById("alertaProximaTexto");

    const ahoraMin = horaAMinutos(horaActual);
    const en30Min = ahoraMin + 30;

    const citaProxima = citas.find(c =>
        c.ct_eci_id_estado_cita === 2 && // Confirmada
        horaAMinutos(c.ct_hora_inicio.substring(0, 5)) >= ahoraMin &&
        horaAMinutos(c.ct_hora_inicio.substring(0, 5)) <= en30Min
    );

    if (citaProxima) {
        const clienteNombre = citaProxima.datos_cliente ? citaProxima.datos_cliente.dc_nombre : '';
        alertaTexto.textContent = `Cita confirmada en los próximos 30 min: ${citaProxima.ct_hora_inicio.substring(0, 5)} - ${clienteNombre}`;
        alertaEl.style.display = 'flex';
    } else {
        alertaEl.style.display = 'none';
    }
}

function renderizarCitasDelDia(citas) {
    const container = document.getElementById("citasDelDia");
    container.innerHTML = "";

    if (!citas || citas.length === 0) {
        container.innerHTML = '<div class="text-muted text-center" style="font-size:12px; padding:10px;">No hay citas para hoy</div>';
        return;
    }

    // Sort by hora_inicio ascending
    const sorted = [...citas].sort((a, b) => a.ct_hora_inicio.localeCompare(b.ct_hora_inicio));

    sorted.forEach(cita => {
        const clienteNombre = cita.datos_cliente ? cita.datos_cliente.dc_nombre : 'N/A';
        const mascotaNombre = cita.datos_mascota ? cita.datos_mascota.dm_nombre : 'N/A';
        const tipoNombre = cita.tipo_cita ? cita.tipo_cita.tc_nombre : 'N/A';
        const tipoColor = cita.tipo_cita ? cita.tipo_cita.tc_color : '#007bff';
        const estadoNombre = NOMBRES_ESTADO[cita.ct_eci_id_estado_cita] || 'N/A';
        const estadoColor = COLORES_ESTADO[cita.ct_eci_id_estado_cita] || '#6c757d';
        const vetNombre = cita.personal_vet ? `${cita.personal_vet.pv_primer_nombre} ${cita.personal_vet.pv_primer_apellido}` : 'N/A';

        // Build action buttons based on allowed transitions
        const transiciones = TRANSICIONES_ESTADO[cita.ct_eci_id_estado_cita] || [];
        let botonesHTML = '';
        transiciones.forEach(nuevoEstado => {
            const btnColor = nuevoEstado === 3 ? 'btn-danger' : nuevoEstado === 6 ? 'btn-warning' : 'btn-success';
            botonesHTML += `<button class="btn ${btnColor} btn-sm btn-cambiar-estado" data-cita-id="${cita.ct_id_cita}" data-nuevo-estado="${nuevoEstado}">${NOMBRES_ESTADO[nuevoEstado]}</button>`;
        });

        const card = document.createElement("div");
        card.classList.add("cita-dia-card");
        card.style.borderLeftColor = tipoColor;
        card.innerHTML = `
            <div class="cita-hora">${cita.ct_hora_inicio.substring(0, 5)} - ${cita.ct_hora_fin.substring(0, 5)}</div>
            <div class="cita-cliente">${clienteNombre}</div>
            <div class="cita-mascota">${mascotaNombre} • ${vetNombre}</div>
            <div class="cita-badges">
                <span class="badge-tipo-cita" style="background-color:${tipoColor}">${tipoNombre}</span>
                <span class="badge" style="background-color:${estadoColor}; color:#fff; font-size:10px; padding:2px 6px; border-radius:3px;">${estadoNombre}</span>
            </div>
            <div class="cita-acciones">
                ${botonesHTML}
            </div>
        `;

        // Click on card to show detail
        card.addEventListener("click", function (e) {
            if (!e.target.classList.contains("btn-cambiar-estado")) {
                mostrarDetalleCita(cita.ct_id_cita);
            }
        });

        container.appendChild(card);
    });

    // Attach state change button events
    container.querySelectorAll(".btn-cambiar-estado").forEach(btn => {
        btn.addEventListener("click", function (e) {
            e.stopPropagation();
            const citaId = parseInt(this.dataset.citaId);
            const nuevoEstado = parseInt(this.dataset.nuevoEstado);
            cambiarEstadoCita(citaId, nuevoEstado);
        });
    });
}


// ================= DETALLE CITA MODAL =================

async function mostrarDetalleCita(citaId) {
    const { data: cita, error } = await supabaseClient
        .from("citas")
        .select(`
            *,
            tipo_cita ( tc_nombre, tc_color, tc_duracion_minutos ),
            estado_cita ( eci_estado, eci_color ),
            datos_cliente ( dc_id_cliente, dc_nombre ),
            datos_mascota ( dm_id_mascota, dm_nombre, dm_especie ),
            personal_vet ( pv_documento, pv_primer_nombre, pv_primer_apellido )
        `)
        .eq("ct_id_cita", citaId)
        .single();

    if (error || !cita) {
        await Swal.fire({ title: "Error", text: "No se pudo cargar la cita.", icon: "error" });
        return;
    }

    // Populate detail fields
    document.getElementById("detalle_cliente").textContent = cita.datos_cliente ? cita.datos_cliente.dc_nombre : 'N/A';
    document.getElementById("detalle_mascota").textContent = cita.datos_mascota ? `${cita.datos_mascota.dm_nombre} (${cita.datos_mascota.dm_especie})` : 'N/A';
    document.getElementById("detalle_tipo").textContent = cita.tipo_cita ? cita.tipo_cita.tc_nombre : 'N/A';
    document.getElementById("detalle_veterinario").textContent = cita.personal_vet ? `${cita.personal_vet.pv_primer_nombre} ${cita.personal_vet.pv_primer_apellido}` : 'N/A';
    document.getElementById("detalle_fecha").textContent = new Date(cita.ct_fecha + 'T12:00:00').toLocaleDateString('es-CO');
    document.getElementById("detalle_hora").textContent = `${cita.ct_hora_inicio.substring(0, 5)} - ${cita.ct_hora_fin.substring(0, 5)}`;

    const estadoNombre = NOMBRES_ESTADO[cita.ct_eci_id_estado_cita] || 'N/A';
    const estadoColor = COLORES_ESTADO[cita.ct_eci_id_estado_cita] || '#6c757d';
    document.getElementById("detalle_estado").innerHTML = `<span class="badge" style="background-color:${estadoColor}; color:#fff; padding:4px 10px; border-radius:4px;">${estadoNombre}</span>`;

    document.getElementById("detalle_notas").textContent = cita.ct_notas || 'Sin notas';

    // Show consulta link if exists
    const consultaRow = document.getElementById("detalle_consulta_row");
    if (cita.ct_cm_id_consulta) {
        consultaRow.style.display = 'flex';
        document.getElementById("detalle_consulta").innerHTML = `<a href="consultas.html?id=${cita.ct_cm_id_consulta}" class="text-success">Ver Consulta #${cita.ct_cm_id_consulta}</a>`;
    } else {
        consultaRow.style.display = 'none';
    }

    // Render state change buttons
    const accionesContainer = document.getElementById("detalle_acciones_estado");
    accionesContainer.innerHTML = '';
    const transiciones = TRANSICIONES_ESTADO[cita.ct_eci_id_estado_cita] || [];

    transiciones.forEach(nuevoEstado => {
        const btn = document.createElement("button");
        const btnClass = nuevoEstado === 3 ? 'btn-danger' : nuevoEstado === 6 ? 'btn-warning' : 'btn-success';
        btn.className = `btn ${btnClass} btn-sm`;
        btn.textContent = NOMBRES_ESTADO[nuevoEstado];
        btn.addEventListener("click", () => cambiarEstadoCita(cita.ct_id_cita, nuevoEstado));
        accionesContainer.appendChild(btn);
    });

    // Store cita data for edit button
    document.getElementById("btnEditarCita").dataset.citaId = cita.ct_id_cita;

    $('#modalDetalleCita').modal('show');
}

// ================= CONFIG MODALS =================

// --- Tipos de Cita ---

async function renderizarTablaTiposCita() {
    const { data, error } = await supabaseClient
        .from("tipo_cita")
        .select(`
            *,
            personal_vet ( pv_primer_nombre, pv_primer_apellido )
        `)
        .order("tc_nombre");

    if (error) {
        console.error("Error cargando tipos de cita:", error.message);
        return;
    }

    const tbody = document.getElementById("tablaTiposCita");
    tbody.innerHTML = "";

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No hay tipos de cita registrados</td></tr>';
        return;
    }

    data.forEach(tc => {
        const vetNombre = tc.personal_vet ? `${tc.personal_vet.pv_primer_nombre} ${tc.personal_vet.pv_primer_apellido}` : 'Ninguno';
        const tr = document.createElement("tr");
        tr.classList.add("text-center");
        tr.innerHTML = `
            <td>${tc.tc_nombre}</td>
            <td>${tc.tc_duracion_minutos}</td>
            <td>${Number(tc.tc_precio).toLocaleString('es-CO')}</td>
            <td><span class="color-swatch" style="background-color:${tc.tc_color}"></span></td>
            <td>${vetNombre}</td>
            <td>
                <button class="btn btn-success btn-sm btn-editar-tipo" data-id="${tc.tc_id_tipo_cita}" title="Editar">✏️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Attach edit buttons
    tbody.querySelectorAll(".btn-editar-tipo").forEach(btn => {
        btn.addEventListener("click", function () {
            const id = parseInt(this.dataset.id);
            const tipo = data.find(t => t.tc_id_tipo_cita === id);
            if (tipo) {
                document.getElementById("tc_id_tipo_cita").value = tipo.tc_id_tipo_cita;
                document.getElementById("tc_nombre").value = tipo.tc_nombre;
                document.getElementById("tc_duracion_minutos").value = tipo.tc_duracion_minutos;
                document.getElementById("tc_precio").value = tipo.tc_precio;
                document.getElementById("tc_color").value = tipo.tc_color;
                document.getElementById("tc_pv_documento").value = tipo.tc_pv_documento || "";
                document.getElementById("formTipoCitaTitulo").textContent = "Editar Tipo de Cita";
                document.getElementById("btnGuardarTipoCita").textContent = "Actualizar";
                document.getElementById("btnCancelarTipoCita").style.display = "inline-block";
            }
        });
    });
}

async function guardarTipoCita(e) {
    e.preventDefault();

    const idTipo = document.getElementById("tc_id_tipo_cita").value;
    const data = {
        tc_nombre: document.getElementById("tc_nombre").value.trim(),
        tc_duracion_minutos: parseInt(document.getElementById("tc_duracion_minutos").value),
        tc_precio: parseFloat(document.getElementById("tc_precio").value),
        tc_color: document.getElementById("tc_color").value,
        tc_pv_documento: document.getElementById("tc_pv_documento").value ? parseInt(document.getElementById("tc_pv_documento").value) : null
    };

    if (!data.tc_nombre || isNaN(data.tc_duracion_minutos) || isNaN(data.tc_precio)) {
        await Swal.fire({
            title: "Campos incompletos",
            text: "Por favor complete todos los campos obligatorios.",
            icon: "warning"
        });
        return;
    }

    if (data.tc_duracion_minutos < 15 || data.tc_duracion_minutos > 480) {
        await Swal.fire({
            title: "Duración inválida",
            text: "La duración debe estar entre 15 y 480 minutos.",
            icon: "warning"
        });
        return;
    }

    if (idTipo) {
        // Update
        const { error } = await supabaseClient
            .from("tipo_cita")
            .update(data)
            .eq("tc_id_tipo_cita", parseInt(idTipo));

        if (error) {
            manejarErrorSupabase(error);
            return;
        }

        await Swal.fire({ title: "Tipo actualizado", icon: "success", timer: 1500, showConfirmButton: false });
    } else {
        // Create
        const { error } = await supabaseClient
            .from("tipo_cita")
            .insert(data);

        if (error) {
            manejarErrorSupabase(error);
            return;
        }

        await Swal.fire({ title: "Tipo registrado", icon: "success", timer: 1500, showConfirmButton: false });
    }

    // Reset form
    document.getElementById("formTipoCita").reset();
    document.getElementById("tc_id_tipo_cita").value = "";
    document.getElementById("tc_color").value = "#007bff";
    document.getElementById("formTipoCitaTitulo").textContent = "Agregar Tipo de Cita";
    document.getElementById("btnGuardarTipoCita").textContent = "Agregar";
    document.getElementById("btnCancelarTipoCita").style.display = "none";

    await renderizarTablaTiposCita();
    await cargarTiposCita();
}

// --- Horario Veterinario ---

async function cargarHorarioVeterinario(vetDoc) {
    if (!vetDoc) return;

    // Reset all checkboxes and inputs
    for (let dia = 1; dia <= 6; dia++) {
        document.getElementById(`hv_activo_${dia}`).checked = false;
        document.getElementById(`hv_inicio_${dia}`).value = "";
        document.getElementById(`hv_inicio_${dia}`).disabled = true;
        document.getElementById(`hv_fin_${dia}`).value = "";
        document.getElementById(`hv_fin_${dia}`).disabled = true;
    }
    document.getElementById("hv_buffer_minutos").value = 0;

    const { data, error } = await supabaseClient
        .from("horario_veterinario")
        .select("*")
        .eq("hv_pv_documento", parseInt(vetDoc));

    if (error) {
        console.error("Error cargando horario:", error.message);
        return;
    }

    if (data && data.length > 0) {
        data.forEach(h => {
            const dia = h.hv_dia_semana;
            if (dia >= 1 && dia <= 6) {
                document.getElementById(`hv_activo_${dia}`).checked = true;
                document.getElementById(`hv_inicio_${dia}`).value = h.hv_hora_inicio.substring(0, 5);
                document.getElementById(`hv_inicio_${dia}`).disabled = false;
                document.getElementById(`hv_fin_${dia}`).value = h.hv_hora_fin.substring(0, 5);
                document.getElementById(`hv_fin_${dia}`).disabled = false;
            }
        });
        // Use buffer from first record
        document.getElementById("hv_buffer_minutos").value = data[0].hv_buffer_minutos || 0;
    }
}

async function guardarHorarioVeterinario() {
    const vetDoc = document.getElementById("horario_veterinario_select").value;
    if (!vetDoc) {
        await Swal.fire({ title: "Seleccione un veterinario", icon: "warning" });
        return;
    }

    const buffer = parseInt(document.getElementById("hv_buffer_minutos").value) || 0;

    if (buffer < 0 || buffer > 60) {
        await Swal.fire({
            title: "Buffer inválido",
            text: "El tiempo buffer debe estar entre 0 y 60 minutos.",
            icon: "warning"
        });
        return;
    }

    // Collect active days
    const horarios = [];
    for (let dia = 1; dia <= 6; dia++) {
        const activo = document.getElementById(`hv_activo_${dia}`).checked;
        if (activo) {
            const inicio = document.getElementById(`hv_inicio_${dia}`).value;
            const fin = document.getElementById(`hv_fin_${dia}`).value;

            if (!inicio || !fin) {
                await Swal.fire({
                    title: "Horario incompleto",
                    text: `Complete las horas para el día ${['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][dia]}.`,
                    icon: "warning"
                });
                return;
            }

            if (inicio >= fin) {
                await Swal.fire({
                    title: "Horario inválido",
                    text: `La hora de inicio debe ser anterior a la hora de fin para el día ${['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][dia]}.`,
                    icon: "warning"
                });
                return;
            }

            horarios.push({
                hv_pv_documento: parseInt(vetDoc),
                hv_dia_semana: dia,
                hv_hora_inicio: inicio,
                hv_hora_fin: fin,
                hv_buffer_minutos: buffer
            });
        }
    }

    // Delete existing horarios for this vet
    const { error: errDelete } = await supabaseClient
        .from("horario_veterinario")
        .delete()
        .eq("hv_pv_documento", parseInt(vetDoc));

    if (errDelete) {
        await Swal.fire({ title: "Error", text: errDelete.message, icon: "error" });
        return;
    }

    // Insert new horarios
    if (horarios.length > 0) {
        const { error: errInsert } = await supabaseClient
            .from("horario_veterinario")
            .insert(horarios);

        if (errInsert) {
            await Swal.fire({ title: "Error", text: errInsert.message, icon: "error" });
            return;
        }
    }

    await Swal.fire({
        title: "Horario guardado",
        icon: "success",
        timer: 2000,
        showConfirmButton: false
    });
}

// --- Bloqueos ---

async function crearBloqueo(e) {
    e.preventDefault();

    const vetDoc = document.getElementById("bh_pv_documento").value;
    const fecha = document.getElementById("bh_fecha").value;
    const horaInicio = document.getElementById("bh_hora_inicio").value;
    const horaFin = document.getElementById("bh_hora_fin").value;
    const motivo = document.getElementById("bh_motivo").value.trim();

    if (!fecha || !horaInicio || !horaFin || !motivo) {
        await Swal.fire({
            title: "Campos incompletos",
            text: "Por favor complete todos los campos obligatorios.",
            icon: "warning"
        });
        return;
    }

    if (horaInicio >= horaFin) {
        await Swal.fire({
            title: "Horario inválido",
            text: "La hora de inicio debe ser anterior a la hora de fin.",
            icon: "warning"
        });
        return;
    }

    // Check for overlapping citas
    let citasQuery = supabaseClient
        .from("citas")
        .select("ct_id_cita, ct_hora_inicio, ct_hora_fin, datos_cliente(dc_nombre)")
        .eq("ct_fecha", fecha)
        .in("ct_eci_id_estado_cita", [1, 2])
        .lt("ct_hora_inicio", horaFin)
        .gt("ct_hora_fin", horaInicio);

    if (vetDoc) {
        citasQuery = citasQuery.eq("ct_pv_documento", parseInt(vetDoc));
    }

    const { data: citasAfectadas } = await citasQuery;

    if (citasAfectadas && citasAfectadas.length > 0) {
        const result = await Swal.fire({
            title: "⚠️ Citas existentes",
            html: `Existen <strong>${citasAfectadas.length}</strong> cita(s) en este horario. ¿Desea continuar con el bloqueo?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#28a745",
            cancelButtonColor: "#d33",
            confirmButtonText: "Sí, crear bloqueo",
            cancelButtonText: "Cancelar"
        });
        if (!result.isConfirmed) return;
    }

    const bloqueoData = {
        bh_pv_documento: vetDoc ? parseInt(vetDoc) : null,
        bh_fecha: fecha,
        bh_hora_inicio: horaInicio,
        bh_hora_fin: horaFin,
        bh_motivo: motivo
    };

    const { error } = await supabaseClient
        .from("bloqueo_horario")
        .insert(bloqueoData);

    if (error) {
        manejarErrorSupabase(error);
        return;
    }

    await Swal.fire({
        title: "Bloqueo creado",
        icon: "success",
        timer: 2000,
        showConfirmButton: false
    });

    $('#modalBloqueo').modal('hide');
    document.getElementById("formBloqueo").reset();
    calendarInstance.refetchEvents();
}

async function eliminarBloqueo(bloqueoId) {
    const { error } = await supabaseClient
        .from("bloqueo_horario")
        .delete()
        .eq("bh_id_bloqueo", bloqueoId);

    if (error) {
        await Swal.fire({ title: "Error", text: error.message, icon: "error" });
        return;
    }

    await Swal.fire({
        title: "Bloqueo eliminado",
        icon: "success",
        timer: 1500,
        showConfirmButton: false
    });

    calendarInstance.refetchEvents();
}

// --- Días No Laborales ---

async function cargarDiasNoLaborales() {
    const { data, error } = await supabaseClient
        .from("dia_no_laboral")
        .select("*")
        .order("dnl_fecha", { ascending: false });

    if (error) {
        console.error("Error cargando días no laborales:", error.message);
        return;
    }

    const tbody = document.getElementById("tablaDiasNoLaborales");
    tbody.innerHTML = "";

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No hay días no laborales registrados</td></tr>';
        return;
    }

    data.forEach(dnl => {
        const tr = document.createElement("tr");
        tr.classList.add("text-center");
        tr.innerHTML = `
            <td>${new Date(dnl.dnl_fecha + 'T12:00:00').toLocaleDateString('es-CO')}</td>
            <td>${dnl.dnl_descripcion}</td>
            <td>
                <button class="btn btn-danger btn-sm btn-eliminar-dnl" data-id="${dnl.dnl_id_dia}" title="Eliminar">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Attach delete buttons
    tbody.querySelectorAll(".btn-eliminar-dnl").forEach(btn => {
        btn.addEventListener("click", async function () {
            const id = parseInt(this.dataset.id);
            await eliminarDiaNoLaboral(id);
        });
    });
}

async function registrarDiaNoLaboral(e) {
    e.preventDefault();

    const fecha = document.getElementById("dnl_fecha").value;
    const descripcion = document.getElementById("dnl_descripcion").value.trim();

    if (!fecha || !descripcion) {
        await Swal.fire({
            title: "Campos incompletos",
            text: "Por favor complete todos los campos.",
            icon: "warning"
        });
        return;
    }

    const { error } = await supabaseClient
        .from("dia_no_laboral")
        .insert({ dnl_fecha: fecha, dnl_descripcion: descripcion });

    if (error) {
        if (error.code === '23505') {
            await Swal.fire({
                title: "Duplicado",
                text: "Ya existe un día no laboral para esa fecha.",
                icon: "error"
            });
        } else {
            manejarErrorSupabase(error);
        }
        return;
    }

    await Swal.fire({
        title: "Día no laboral registrado",
        icon: "success",
        timer: 1500,
        showConfirmButton: false
    });

    document.getElementById("formDiaNoLaboral").reset();
    await cargarDiasNoLaborales();
    calendarInstance.refetchEvents();
}

async function eliminarDiaNoLaboral(id) {
    const result = await Swal.fire({
        title: "¿Eliminar este día no laboral?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#28a745",
        cancelButtonColor: "#d33",
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar"
    });

    if (!result.isConfirmed) return;

    const { error } = await supabaseClient
        .from("dia_no_laboral")
        .delete()
        .eq("dnl_id_dia", id);

    if (error) {
        await Swal.fire({ title: "Error", text: error.message, icon: "error" });
        return;
    }

    await Swal.fire({
        title: "Día eliminado",
        icon: "success",
        timer: 1500,
        showConfirmButton: false
    });

    await cargarDiasNoLaborales();
    calendarInstance.refetchEvents();
}


// ================= HISTORY & CONSULTA INTEGRATION =================

async function buscarHistorialCitas() {
    const clienteId = document.getElementById("historial_cliente").value;
    const mascotaId = document.getElementById("historial_mascota").value;
    const fechaInicio = document.getElementById("historial_fecha_inicio").value;
    const fechaFin = document.getElementById("historial_fecha_fin").value;
    const estadoId = document.getElementById("historial_estado").value;

    let query = supabaseClient
        .from("citas")
        .select(`
            *,
            tipo_cita ( tc_nombre ),
            estado_cita ( eci_estado, eci_color ),
            datos_cliente ( dc_nombre ),
            datos_mascota ( dm_nombre ),
            personal_vet ( pv_primer_nombre, pv_primer_apellido )
        `)
        .order("ct_fecha", { ascending: false })
        .order("ct_hora_inicio", { ascending: false });

    if (clienteId) {
        query = query.eq("ct_dc_id_cliente", parseInt(clienteId));
    }
    if (mascotaId) {
        query = query.eq("ct_dm_id_mascota", parseInt(mascotaId));
    }
    if (fechaInicio) {
        query = query.gte("ct_fecha", fechaInicio);
    }
    if (fechaFin) {
        query = query.lte("ct_fecha", fechaFin);
    }
    if (estadoId) {
        query = query.eq("ct_eci_id_estado_cita", parseInt(estadoId));
    }

    query = query.limit(100);

    const { data, error } = await query;

    if (error) {
        await Swal.fire({ title: "Error", text: error.message, icon: "error" });
        return;
    }

    renderizarTablaHistorial(data || []);
}

function renderizarTablaHistorial(citas) {
    const tbody = document.getElementById("tablaHistorialCitas");
    tbody.innerHTML = "";

    if (!citas || citas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No se encontraron citas</td></tr>';
        return;
    }

    citas.forEach(cita => {
        const estadoNombre = cita.estado_cita ? cita.estado_cita.eci_estado : 'N/A';
        const estadoColor = cita.estado_cita ? cita.estado_cita.eci_color : '#6c757d';
        const vetNombre = cita.personal_vet ? `${cita.personal_vet.pv_primer_nombre} ${cita.personal_vet.pv_primer_apellido}` : 'N/A';

        const tr = document.createElement("tr");
        tr.classList.add("text-center");
        tr.innerHTML = `
            <td>${new Date(cita.ct_fecha + 'T12:00:00').toLocaleDateString('es-CO')}</td>
            <td>${cita.ct_hora_inicio.substring(0, 5)} - ${cita.ct_hora_fin.substring(0, 5)}</td>
            <td>${cita.tipo_cita ? cita.tipo_cita.tc_nombre : 'N/A'}</td>
            <td>${vetNombre}</td>
            <td>${cita.datos_mascota ? cita.datos_mascota.dm_nombre : 'N/A'}</td>
            <td>${cita.datos_cliente ? cita.datos_cliente.dc_nombre : 'N/A'}</td>
            <td><span class="badge" style="background-color:${estadoColor}; color:#fff; padding:3px 8px; border-radius:3px;">${estadoNombre}</span></td>
            <td>${cita.ct_notas || '-'}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function ofrecerCrearConsulta(citaId) {
    const result = await Swal.fire({
        title: "Cita Finalizada",
        text: "¿Desea crear una consulta médica asociada a esta cita?",
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#28a745",
        cancelButtonColor: "#6c757d",
        confirmButtonText: "Sí, crear consulta",
        cancelButtonText: "No, solo finalizar"
    });

    if (result.isConfirmed) {
        await crearConsultaDesdeCita(citaId);
    }
}

async function crearConsultaDesdeCita(citaId) {
    // Fetch cita data
    const { data: cita, error: errCita } = await supabaseClient
        .from("citas")
        .select(`
            *,
            tipo_cita ( tc_nombre ),
            datos_cliente ( dc_id_cliente, dc_nombre ),
            datos_mascota ( dm_id_mascota, dm_nombre )
        `)
        .eq("ct_id_cita", citaId)
        .single();

    if (errCita || !cita) {
        await Swal.fire({ title: "Error", text: "No se pudo obtener los datos de la cita.", icon: "error" });
        return;
    }

    // Create consulta médica pre-filled
    const consultaData = {
        cm_dc_id_cliente: cita.ct_dc_id_cliente,
        cm_dm_id_mascota: cita.ct_dm_id_mascota,
        cm_fecha_consulta: cita.ct_fecha,
        cm_motivo_consulta: cita.tipo_cita ? `Cita: ${cita.tipo_cita.tc_nombre}` : 'Cita veterinaria',
        cm_ec_id_estado: 1 // Estado inicial
    };

    const { data: consulta, error: errConsulta } = await supabaseClient
        .from("consulta_medica")
        .insert(consultaData)
        .select()
        .single();

    if (errConsulta) {
        await Swal.fire({ title: "Error", text: errConsulta.message, icon: "error" });
        return;
    }

    // Update cita with consulta reference
    const { error: errUpdate } = await supabaseClient
        .from("citas")
        .update({ ct_cm_id_consulta: consulta.cm_id_consulta })
        .eq("ct_id_cita", citaId);

    if (errUpdate) {
        console.error("Error vinculando consulta:", errUpdate.message);
    }

    await Swal.fire({
        title: "Consulta creada",
        html: `Consulta médica #${consulta.cm_id_consulta} creada y vinculada a la cita.`,
        icon: "success",
        timer: 3000,
        showConfirmButton: true
    });
}

async function editarCitaDesdeDetalle() {
    const citaId = parseInt(document.getElementById("btnEditarCita").dataset.citaId);

    // Fetch full cita data
    const { data: cita, error } = await supabaseClient
        .from("citas")
        .select("*")
        .eq("ct_id_cita", citaId)
        .single();

    if (error || !cita) {
        await Swal.fire({ title: "Error", text: "No se pudo cargar la cita.", icon: "error" });
        return;
    }

    // Close detail modal
    $('#modalDetalleCita').modal('hide');

    // Populate form
    document.getElementById("ct_id_cita").value = cita.ct_id_cita;
    document.getElementById("ct_dc_id_cliente").value = cita.ct_dc_id_cliente;

    // Load mascotas for this client
    await cargarMascotasPorCliente(cita.ct_dc_id_cliente);
    document.getElementById("ct_dm_id_mascota").value = cita.ct_dm_id_mascota;

    document.getElementById("ct_tc_id_tipo_cita").value = cita.ct_tc_id_tipo_cita;
    document.getElementById("ct_pv_documento").value = cita.ct_pv_documento;
    document.getElementById("ct_fecha").value = cita.ct_fecha;

    // Load available slots
    await cargarSlotsDisponibles();

    // Add current time as option if not in list
    const horaSelect = document.getElementById("ct_hora_inicio");
    const currentHora = cita.ct_hora_inicio.substring(0, 5);
    let found = false;
    for (let i = 0; i < horaSelect.options.length; i++) {
        if (horaSelect.options[i].value === currentHora) {
            found = true;
            break;
        }
    }
    if (!found) {
        const opt = document.createElement("option");
        opt.value = currentHora;
        opt.textContent = `${currentHora} - ${cita.ct_hora_fin.substring(0, 5)} (actual)`;
        horaSelect.appendChild(opt);
    }
    horaSelect.value = currentHora;
    horaSelect.disabled = false;

    // Update hora fin display
    actualizarHoraFin();

    document.getElementById("ct_notas").value = cita.ct_notas || "";
    document.getElementById("modalCitaLabel").textContent = "Editar Cita";

    // Open cita modal
    setTimeout(() => {
        $('#modalCita').modal('show');
    }, 300);
}

// ================= HISTORIAL MASCOTA LOADER =================

async function cargarMascotasHistorial(clienteId) {
    const mascotaSelect = document.getElementById("historial_mascota");
    mascotaSelect.innerHTML = '<option value="">Todas las mascotas</option>';

    if (!clienteId) return;

    const { data, error } = await supabaseClient
        .from("datos_mascota")
        .select("dm_id_mascota, dm_nombre")
        .eq("dm_dc_id_cliente", parseInt(clienteId))
        .order("dm_nombre");

    if (error) return;

    (data || []).forEach(m => {
        const opt = document.createElement("option");
        opt.value = m.dm_id_mascota;
        opt.textContent = m.dm_nombre;
        mascotaSelect.appendChild(opt);
    });
}


// ================= ERROR HANDLING =================

function manejarErrorSupabase(error) {
    let titulo = "Error";
    let mensaje = error.message;

    if (error.code === '23505') {
        titulo = "Registro duplicado";
        if (mensaje.includes('tipo_cita')) {
            mensaje = "Ya existe un tipo de cita con ese nombre.";
        } else if (mensaje.includes('dia_no_laboral')) {
            mensaje = "Ya existe un día no laboral para esa fecha.";
        } else {
            mensaje = "Ya existe un registro con esos datos.";
        }
    } else if (error.code === '23503') {
        titulo = "Referencia inválida";
        mensaje = "El cliente, mascota o veterinario seleccionado no existe.";
    } else if (error.code === '23514') {
        titulo = "Validación fallida";
        if (mensaje.includes('duracion')) {
            mensaje = "La duración debe estar entre 15 y 480 minutos.";
        } else if (mensaje.includes('hora')) {
            mensaje = "La hora de inicio debe ser anterior a la hora de fin.";
        } else if (mensaje.includes('buffer')) {
            mensaje = "El tiempo buffer debe estar entre 0 y 60 minutos.";
        }
    }

    Swal.fire({
        title: titulo,
        text: mensaje,
        icon: "error"
    });
}

// ================= EVENT LISTENERS =================

function inicializarEventListeners() {
    // --- Filter selects ---
    document.getElementById("filtroVeterinario").addEventListener("change", aplicarFiltros);
    document.getElementById("filtroTipoCita").addEventListener("change", aplicarFiltros);
    document.getElementById("filtroEstadoCita").addEventListener("change", aplicarFiltros);
    document.getElementById("btnLimpiarFiltros").addEventListener("click", limpiarFiltros);

    // --- Form Cita ---
    document.getElementById("formCita").addEventListener("submit", guardarCita);

    // Client change → load mascotas
    document.getElementById("ct_dc_id_cliente").addEventListener("change", function () {
        cargarMascotasPorCliente(this.value);
        // Reset dependent fields
        document.getElementById("ct_hora_inicio").innerHTML = '<option value="">Seleccione veterinario y fecha</option>';
        document.getElementById("ct_hora_inicio").disabled = true;
        document.getElementById("ct_hora_fin_display").textContent = '--:--';
    });

    // Tipo cita change → pre-select vet
    document.getElementById("ct_tc_id_tipo_cita").addEventListener("change", function () {
        const tipoId = parseInt(this.value);
        const tipoCita = tiposCitaCache.find(tc => tc.tc_id_tipo_cita === tipoId);
        if (tipoCita && tipoCita.tc_pv_documento) {
            document.getElementById("ct_pv_documento").value = tipoCita.tc_pv_documento;
        }
        // Reload slots if vet and date are set
        cargarSlotsDisponibles();
    });

    // Vet change → load slots
    document.getElementById("ct_pv_documento").addEventListener("change", cargarSlotsDisponibles);

    // Date change → load slots
    document.getElementById("ct_fecha").addEventListener("change", cargarSlotsDisponibles);

    // Hora inicio change → calculate hora fin
    document.getElementById("ct_hora_inicio").addEventListener("change", actualizarHoraFin);

    // --- Form Tipo Cita ---
    document.getElementById("formTipoCita").addEventListener("submit", guardarTipoCita);

    // Cancel edit tipo cita
    document.getElementById("btnCancelarTipoCita").addEventListener("click", function () {
        document.getElementById("formTipoCita").reset();
        document.getElementById("tc_id_tipo_cita").value = "";
        document.getElementById("tc_color").value = "#007bff";
        document.getElementById("formTipoCitaTitulo").textContent = "Agregar Tipo de Cita";
        document.getElementById("btnGuardarTipoCita").textContent = "Agregar";
        this.style.display = "none";
    });

    // --- Horario Veterinario ---
    document.getElementById("btnGuardarHorario").addEventListener("click", guardarHorarioVeterinario);

    document.getElementById("horario_veterinario_select").addEventListener("change", function () {
        cargarHorarioVeterinario(this.value);
    });

    // Checkbox toggles for each day
    for (let dia = 1; dia <= 6; dia++) {
        document.getElementById(`hv_activo_${dia}`).addEventListener("change", function () {
            const enabled = this.checked;
            document.getElementById(`hv_inicio_${dia}`).disabled = !enabled;
            document.getElementById(`hv_fin_${dia}`).disabled = !enabled;
            if (!enabled) {
                document.getElementById(`hv_inicio_${dia}`).value = "";
                document.getElementById(`hv_fin_${dia}`).value = "";
            }
        });
    }

    // --- Bloqueo ---
    document.getElementById("formBloqueo").addEventListener("submit", crearBloqueo);

    // --- Días No Laborales ---
    document.getElementById("formDiaNoLaboral").addEventListener("submit", registrarDiaNoLaboral);

    // --- Historial ---
    document.getElementById("btnBuscarHistorial").addEventListener("click", buscarHistorialCitas);

    // Historial client change → load mascotas
    document.getElementById("historial_cliente").addEventListener("change", function () {
        cargarMascotasHistorial(this.value);
    });

    // --- Editar Cita from Detail ---
    document.getElementById("btnEditarCita").addEventListener("click", editarCitaDesdeDetalle);

    // --- Modal shown events ---
    $('#modalTiposCita').on('shown.bs.modal', function () {
        renderizarTablaTiposCita();
    });

    $('#modalDiasNoLaborales').on('shown.bs.modal', function () {
        cargarDiasNoLaborales();
    });

    $('#modalHistorialCitas').on('shown.bs.modal', function () {
        buscarHistorialCitas();
    });

    // Reset cita form when modal opens for new cita
    $('#modalCita').on('show.bs.modal', function () {
        // Only reset if not editing (no id set)
        if (!document.getElementById("ct_id_cita").value) {
            document.getElementById("modalCitaLabel").textContent = "Nueva Cita";
        }
    });

    // Reset cita form when modal closes
    $('#modalCita').on('hidden.bs.modal', function () {
        document.getElementById("formCita").reset();
        document.getElementById("ct_id_cita").value = "";
        document.getElementById("ct_dm_id_mascota").innerHTML = '<option value="">Seleccione primero un cliente</option>';
        document.getElementById("ct_dm_id_mascota").disabled = true;
        document.getElementById("ct_hora_inicio").innerHTML = '<option value="">Seleccione veterinario y fecha</option>';
        document.getElementById("ct_hora_inicio").disabled = true;
        document.getElementById("ct_hora_fin_display").textContent = '--:--';
        document.getElementById("modalCitaLabel").textContent = "Nueva Cita";
        // Remove is-invalid classes
        document.querySelectorAll('#formCita .is-invalid').forEach(el => el.classList.remove('is-invalid'));
    });
}
