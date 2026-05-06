let mascota = null;
let consultaActualId = null;


function limpiarCamposConsulta() {
    document.getElementById("formConsulta").reset();
}


// ================= CONFIG =================

const SUPABASE_URL = "https://nlqtzidfowoxylporidi.supabase.co";
const SUPABASE_KEY = "sb_publishable_Qe7khKcVgFoN1KpXydGbcA_mEddQQNi";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

document.addEventListener("DOMContentLoaded", function () {
    generarExamenFisico();
});

document.addEventListener("DOMContentLoaded", async () => {

    const mascotaId = localStorage.getItem("mascotaId");
    if (!mascotaId) return;

    const { data, error } = await supabaseClient
        .from("datos_mascota")
        .select(`
        *,
        datos_cliente (
            dc_nombre
        )
    `)
        .eq("dm_id_mascota", mascotaId)
        .single();

    if (error) return console.error(error);
    mascota = data; // ✅ GUARDAMOS LA MASCOTA GLOBALMENTE
    // Mostrar ficha mascota
    document.getElementById("fichaMascota").classList.remove("d-none");

    document.getElementById("fm_nombre").textContent = mascota.dm_nombre;
    document.getElementById("fm_especie").textContent = mascota.dm_especie;
    document.getElementById("fm_raza").textContent = mascota.dm_raza;
    document.getElementById("fm_sexo").textContent = mascota.dm_sexo;
    document.getElementById("fm_peso").textContent = mascota.dm_peso + " Kg";
    document.getElementById("fm_esterilizado").innerHTML =
        mascota.dm_esterilizado.toUpperCase() === "S"
            ? '<span style="color:green;font-weight:bold;">✓</span>'
            : '<span style="color:red;font-weight:bold;">✗</span>';
    const fecha = mascota.dm_fecha_nacimiento.split(" ")[0]; // yyyy-mm-dd
    const [year, month, day] = fecha.split("-");

    document.getElementById("fm_fechaNacimiento").textContent =
        `${day}/${month}/${year}`;



    btnGenerarConsulta.disabled = false;
    cargarConsultas();
});



document.getElementById("btnGenerarConsulta").onclick = () => {
    document.getElementById("dm_dc_id_cliente").value = mascota.dm_dc_id_cliente;
    document.getElementById("dm_id_mascota").value = mascota.dm_id_mascota;
    limpiarCamposConsulta();
    $('#modalRegistroConsulta').modal('show');
};

document.getElementById("formConsulta").addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
        e.preventDefault();
    }
});


document.getElementById("formConsulta")
    .addEventListener("submit", async function (e) {

        e.preventDefault();

        try {

            const dataConsulta = {
                cm_dc_id_cliente: document.getElementById("dm_dc_id_cliente").value,
                cm_dm_id_mascota: document.getElementById("dm_id_mascota").value,
                cm_fecha_consulta: new Date().toLocaleString("sv-SE", { timeZone: "America/Bogota" }),
                cm_motivo_consulta: document.getElementById("cm_motivo_consulta").value,
                cm_diagnosticos_diferenciales: document.getElementById("cm_diagnosticos_diferenciales").value,
                cm_diagnostico_definitivo: document.getElementById("cm_diagnostico_definitivo").value,
                cm_medicamentos_aplicados: serializarMedicamentosConsultaLocal(medicamentosSeleccionados),
                cm_observaciones: document.getElementById("cm_observaciones").value,
                cm_presupuesto: document.getElementById("cm_presupuesto").value,
                cm_ec_id_estado: 1
            };

            const { data, error } = await supabaseClient
                .from("consulta_medica")
                .insert(dataConsulta)
                .select("cm_id_consulta")
                .single();

            if (error) throw new Error(error.message);

            const idConsulta = data.cm_id_consulta;

            await guardarExamenFisico(idConsulta);
            await guardarEctoparasitos(idConsulta);
            await guardarPlanDiagnostico(idConsulta);

            // Task 6.4: Descontar inventario después de guardar consulta
            if (medicamentosSeleccionados.length > 0) {
                await descontarInventarioConsulta(idConsulta, medicamentosSeleccionados);
            }

            await Swal.fire({
                title: "Consulta registrada",
                icon: "success",
                timer: 1200,
                showConfirmButton: false
            });

            $('#modalRegistroConsulta').modal('hide');
            document.getElementById("formConsulta").reset();
            await cargarConsultas();

        } catch (err) {

            Swal.fire("Error", err.message, "error");

        }

    });


function obtenerValorCheckbox(grupo) {

    const seleccionado = document.querySelector(`input[data-group="${grupo}"]:checked`);
    return seleccionado ? seleccionado.value : null;

}

async function guardarEctoparasitos(idConsulta) {

    const dataEctoparasitos = {

        e_cm_id_consulta: idConsulta,

        e_pulgas: obtenerValorCheckbox("pulgas"),
        e_garrapatas: obtenerValorCheckbox("garrapatas"),
        e_pruito: obtenerValorCheckbox("prurito"),

        e_descripcion_pulgas: document.getElementById("e_descripcion_pulgas")?.value || null,
        e_descripcion_garrapatas: document.getElementById("e_descripcion_garrapatas")?.value || null,
        e_descripcion_pruito: document.getElementById("e_descripcion_pruito")?.value || null,

        e_copro_flotacion: obtenerValorCheckbox("copro_flotacion"),
        e_copro_directo: obtenerValorCheckbox("copro_directo")

    };


    const { error } = await supabaseClient
        .from("ectoparasitos")
        .insert(dataEctoparasitos);

    if (error) {
        throw new Error(error.message);
    }

}

async function guardarExamenFisico(idConsulta) {

    const dataExamenFisico = {

        ef_cm_id_consulta: idConsulta,

        ef_peso_mascota: document.getElementById("ef_peso_mascota")?.value || null,

        ef_fr: document.getElementById("ef_fr")?.value || null,
        ef_fc: document.getElementById("ef_fc")?.value || null,
        ef_pulso: document.getElementById("ef_pulso")?.value || null,
        ef_tllc: document.getElementById("ef_tllc")?.value || null,
        ef_deshidratacion: document.getElementById("ef_deshidratacion")?.value || null,
        ef_trufa: document.getElementById("ef_trufa")?.value || null,
        ef_turgencia_piel: document.getElementById("ef_turgencia_piel")?.value || null,
        ef_temperatura: document.getElementById("ef_temperatura")?.value || null,
        ef_reflejo_pupilar: document.getElementById("ef_reflejo_pupilar")?.value || null,
        ef_palp_abdominal: document.getElementById("ef_palp_abdominal")?.value || null,

        ef_estado_conciencia: document.getElementById("ef_estado_conciencia")?.value || null,
        ef_apariencia_general: document.getElementById("ef_apariencia_general")?.value || null,
        ef_color_mucosas: document.getElementById("ef_color_mucosas")?.value || null,
        ef_boca_dientes: document.getElementById("ef_boca_dientes")?.value || null,
        ef_ojos: document.getElementById("ef_ojos")?.value || null,
        ef_oidos: document.getElementById("ef_oidos")?.value || null,
        ef_piel_pelo: document.getElementById("ef_piel_pelo")?.value || null,
        ef_sonidos_cardiacos: document.getElementById("ef_sonidos_cardiacos")?.value || null,
        ef_musculo_esqueletico: document.getElementById("ef_musculo_esqueletico")?.value || null,
        ef_otros: document.getElementById("ef_otros")?.value || null
    };

    const { error } = await supabaseClient
        .from("examen_fisico")
        .insert(dataExamenFisico);

    if (error) {
        throw new Error(error.message);
    }
}

async function guardarPlanDiagnostico(idConsulta) {

    const dataPlanDiagnostico = {

        pd_cm_id_consulta: idConsulta,

        pd_raspado: obtenerValorCheckbox("raspado"),
        pd_citologia: obtenerValorCheckbox("citologia"),
        pd_rx_contraste: obtenerValorCheckbox("contraste"),
        pd_perfil_renal: obtenerValorCheckbox("renal"),
        pd_quimica_sanguinea: obtenerValorCheckbox("sanguinea"),
        pd_perfil_preanestesico: obtenerValorCheckbox("preanestesico"),
        pd_perfil_hepatico: obtenerValorCheckbox("hepatico"),
        pd_snap: obtenerValorCheckbox("snap"),

        pd_radiografia: obtenerValorCheckbox("radiografia"),
        pd_endoscopia: obtenerValorCheckbox("endoscopia"),
        pd_hospitalizacion: obtenerValorCheckbox("hospitalizacion"),
        pd_sedacion: obtenerValorCheckbox("sedacion"),

        pd_suturas: obtenerValorCheckbox("suturas"),
        pd_observacion: obtenerValorCheckbox("observacion"),
        pd_interconsulta: obtenerValorCheckbox("interconsulta"),
        pd_anestesia: obtenerValorCheckbox("anestesia")

    };

    const { error } = await supabaseClient
        .from("plan_diagnostico")
        .insert(dataPlanDiagnostico);

    if (error) {
        throw new Error(error.message);
    }

}


async function cargarConsultas() {

    if (!mascota || !mascota.dm_id_mascota) return;
    const { data, error } = await supabaseClient
        .from("consulta_medica")
        .select(`
        cm_id_consulta,
        cm_fecha_consulta,
        cm_motivo_consulta,
        estado_consulta!consulta_medica_cm_ec_id_estado_fkey (
            ec_estado_consulta
        )
    `)
        .eq("cm_dm_id_mascota", mascota.dm_id_mascota)
        .order("cm_fecha_consulta", { ascending: false });

    const tbody = document.getElementById("tablaConsultas");
    tbody.innerHTML = "";

    if (error || !data || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">
                    No hay consultas registradas
                </td>
            </tr>`;
        return;
    }

    data.forEach(c => {

        let motivo = c.cm_motivo_consulta || "-";

        if (motivo !== "-") {
            const palabras = motivo.split(" ");
            if (palabras.length > 10) {
                motivo = palabras.slice(0, 10).join(" ") + "...";
            }
        }

        tbody.innerHTML += `
        <tr class="text-center align-middle">
            <td>
            ${c.cm_fecha_consulta
                ? c.cm_fecha_consulta.split(" ")[0].split("-").reverse().join("/")
                : "-"
            }
            </td>
            <td>${motivo}</td>
            <td>${c.estado_consulta?.ec_estado_consulta || "-"}</td>
            <td>
                <button 
                    type="button"
                    class="btn btn-success btn-accion btn-ver-consulta"
                    data-id="${c.cm_id_consulta}"
                    title="Ver consulta">
                    👁️
                </button>
                <button 
                    type="button"
                    class="btn btn-info btn-accion btn-formular"
                    data-id="${c.cm_id_consulta}"
                    title="Formular">
                    📄
                </button>
            </td>
        </tr>
    `;
    });


}


// ========================================
// 🔥 MAPEOS (CLAVE PARA QUE FUNCIONE TODO)
// ========================================

const mapaEcto = {
    pulgas: "e_pulgas",
    garrapatas: "e_garrapatas",
    prurito: "e_prurito",
    copro_directo: "e_copro_directo",
    copro_flotacion: "e_copro_flotacion"
};

const mapaPlan = {
    raspado: "pd_raspado",
    citologia: "pd_citologia",
    contraste: "pd_rx_contraste",
    renal: "pd_perfil_renal",
    sanguinea: "pd_quimica_sanguinea",
    preanestesico: "pd_perfil_preanestesico",
    hepatico: "pd_perfil_hepatico",
    snap: "pd_snap",
    radiografia: "pd_radiografia",
    endoscopia: "pd_endoscopia",
    hospitalizacion: "pd_hospitalizacion",
    sedacion: "pd_sedacion",
    anestesia: "pd_anestesia",
    suturas: "pd_suturas",
    observacion: "pd_observacion",
    interconsulta: "pd_interconsulta"
};

// ========================================
// 🔥 EXAMEN FISICO DINÁMICO
// ========================================

const examenFisicoCampos = [
    ["F.R.", "ef_fr"],
    ["Apariencia general", "ef_apariencia_general"],
    ["F.C.", "ef_fc"],
    ["Estado conciencia", "ef_estado_conciencia"],
    ["Pulso", "ef_pulso"],
    ["Color mucosas", "ef_color_mucosas"],
    ["TLLC", "ef_tllc"],
    ["Boca y dientes", "ef_boca_dientes"],
    ["Deshidratación", "ef_deshidratacion"],
    ["Ojos", "ef_ojos"],
    ["Trufa", "ef_trufa"],
    ["Oídos", "ef_oidos"],
    ["Turgencia piel", "ef_turgencia_piel"],
    ["Piel y pelo", "ef_piel_pelo"],
    ["Temperatura", "ef_temperatura"],
    ["Sonidos cardiácos", "ef_sonidos_cardiacos"],
    ["Reflejo pupilar", "ef_reflejo_pupilar"],
    ["S. Músculo esquelético", "ef_musculo_esqueletico"],
    ["Palp. abdominal", "ef_palp_abdominal"],
    ["Otros", "ef_otros"]
];

function generarExamenFisico() {

    const container = document.getElementById("examenFisicoContainer");
    if (!container) return;

    let html = "";

    examenFisicoCampos.forEach(campo => {
        html += `
            <div class="campo">
                <label>${campo[0]}</label>
                <input type="text" id="${campo[1]}" class="form-control">
            </div>
        `;
    });

    container.innerHTML = html;
}

// ========================================
// 🔒 BLOQUEAR / DESBLOQUEAR FORM
// ========================================

function bloquearFormularioConsulta() {
    const form = document.getElementById("formConsulta");

    form.querySelectorAll("input, textarea").forEach(el => el.disabled = true);
    form.querySelectorAll("input[type='checkbox']").forEach(el => el.disabled = true);
}

function desbloquearFormularioConsulta() {
    const form = document.getElementById("formConsulta");

    form.querySelectorAll("input, textarea").forEach(el => el.disabled = false);
    form.querySelectorAll("input[type='checkbox']").forEach(el => el.disabled = false);
}

// ========================================
// 🔥 VER CONSULTA COMPLETA
// ========================================

document.addEventListener("click", async function (e) {

    if (!e.target.classList.contains("btn-ver-consulta")) return;

    const id = e.target.dataset.id;

    try {

        // =========================
        // 🔹 CONSULTA PRINCIPAL
        // =========================
        const { data: consulta } = await supabaseClient
            .from("consulta_medica")
            .select("*")
            .eq("cm_id_consulta", id)
            .single();

        // =========================
        // 🔹 ESTADO
        // =========================
        let estadoTexto = "-";

        if (consulta.cm_ec_id_estado) {
            const { data: estadoData } = await supabaseClient
                .from("estado_consulta")
                .select("ec_estado_consulta")
                .eq("ec_id_estado", consulta.cm_ec_id_estado)
                .single();

            estadoTexto = estadoData?.ec_estado_consulta || "-";
        }

        // =========================
        // 🔹 EXAMEN FISICO
        // =========================
        const { data: examen } = await supabaseClient
            .from("examen_fisico")
            .select("*")
            .eq("ef_cm_id_consulta", id)
            .single();

        // =========================
        // 🔹 ECTOPARASITOS
        // =========================
        const { data: ecto } = await supabaseClient
            .from("ectoparasitos")
            .select("*")
            .eq("e_cm_id_consulta", id)
            .single();

        // =========================
        // 🔹 PLAN DIAGNOSTICO
        // =========================
        const { data: plan } = await supabaseClient
            .from("plan_diagnostico")
            .select("*")
            .eq("pd_cm_id_consulta", id)
            .single();

        console.log("CONSULTA:", consulta);
        console.log("EXAMEN:", examen);
        console.log("ECTO:", ecto);
        console.log("PLAN:", plan);

        generarExamenFisico();

        setTimeout(() => {

            // =========================
            // 🔹 LLENAR CAMPOS
            // =========================

            cm_motivo_consulta.value = consulta.cm_motivo_consulta || "";
            cm_observaciones.value = consulta.cm_observaciones || "";

            cm_diagnosticos_diferenciales.value = consulta.cm_diagnosticos_diferenciales || "";
            cm_diagnostico_definitivo.value = consulta.cm_diagnostico_definitivo || "";

            // Task 8.1: Mostrar medicamentos en modo lectura
            renderMedicamentosReadOnly(consulta.cm_medicamentos_aplicados);

            cm_presupuesto.value = consulta.cm_presupuesto || "";

            // =========================
            // 🔹 EXAMEN FISICO
            // =========================

            const ef = examen || {};

            ef_peso_mascota.value = ef.ef_peso_mascota || "";

            examenFisicoCampos.forEach(campo => {
                const input = document.getElementById(campo[1]);
                if (input) input.value = ef[campo[1]] || "";
            });

            // =========================
            // 🔹 CHECKBOXES (FIX REAL)
            // =========================

            document.querySelectorAll("[data-group]").forEach(chk => {

                const grupo = chk.dataset.group;
                chk.checked = false;

                // ECTOPARASITOS
                if (ecto && mapaEcto[grupo]) {

                    let valorBD = ecto[mapaEcto[grupo]];

                    if (valorBD) {
                        valorBD = valorBD.toString().trim().toUpperCase();
                    }

                    if (valorBD === chk.value) {
                        chk.checked = true;
                    }
                }

                // PLAN DIAGNOSTICO
                if (plan && mapaPlan[grupo]) {
                    if (plan[mapaPlan[grupo]] === chk.value) {
                        chk.checked = true;
                    }
                }

            });

            // DESCRIPCIONES
            e_descripcion_pulgas.value = ecto?.e_descripcion_pulgas || "";
            e_descripcion_garrapatas.value = ecto?.e_descripcion_garrapatas || "";
            e_descripcion_pruito.value = ecto?.e_descripcion_prurito || "";

            // =========================
            // 🔹 FECHA Y ESTADO
            // =========================

            let fechaFormateada = "-";
            if (consulta.cm_fecha_consulta) {
                const [y, m, d] = consulta.cm_fecha_consulta.split(" ")[0].split("-");
                fechaFormateada = `${d}/${m}/${y}`;
            }

            vc_fecha.textContent = fechaFormateada;
            vc_estado.textContent = estadoTexto;
            vc_motivo.textContent = consulta.cm_motivo_consulta || "-";

            // =========================
            // 🔹 UI
            // =========================

            document.getElementById("tituloModalConsulta").textContent = "Detalle consulta";
            document.getElementById("headerVerConsulta").style.display = "block";

            document.getElementById("btnGuardarConsulta").style.display = "none";
            document.getElementById("btnLimpiarCampos").style.display = "none";
            document.getElementById("btnVerSeguimientos").style.display = "inline-block";

            bloquearFormularioConsulta();

        }, 200);

        $('#modalRegistroConsulta').modal('show');

    } catch (error) {
        console.error(error);
        Swal.fire("Error", "No se pudo cargar la consulta", "error");
    }

});


document.getElementById("btnFinalizarConsulta").onclick = async () => {

    const confirmacion = await Swal.fire({
        title: "Finalizar consulta",
        text: "¿ Está seguro? La consulta quedará cerrada.",
        icon: "warning",
        width: 420, // 🔹 Más pequeño
        showCancelButton: true,
        confirmButtonText: "Finalizar",
        cancelButtonText: "Cancelar",
        reverseButtons: true,
        customClass: {
            popup: 'swal-verde',
            confirmButton: 'btn-verde-confirm',
            cancelButton: 'btn-verde-cancel'
        },
        buttonsStyling: false
    });

    if (!confirmacion.isConfirmed) return;

    const { error } = await supabaseClient
        .from("consulta_medica")
        .update({ cm_ec_id_estado: 2 })
        .eq("cm_id_consulta", consultaActualId);

    if (error) {
        Swal.fire("Error", error.message, "error");
        return;
    }

    Swal.fire({
        icon: "success",
        title: "Consulta finalizada",
        width: 380,
        showConfirmButton: false,
        timer: 1200,
        customClass: {
            popup: 'swal-verde-success'
        }
    });

    $('#modalVerConsulta').modal('hide');
    cargarConsultas();
};


document.getElementById("btnDescargarFormula").onclick = async () => {

    // 🔹 Traer nombre del propietario
    const { data: cliente } = await supabaseClient
        .from("datos_cliente")
        .select("dc_nombre")
        .eq("dc_id_cliente", mascota.dm_dc_id_cliente)
        .single();

    const datosPDF = {
        propietario: cliente?.dc_nombre || "",
        mascota: mascota.dm_nombre,
        especie: mascota.dm_especie,
        raza: mascota.dm_raza,
        sexo: mascota.dm_sexo,
        peso: mascota.dm_peso + "Kg",
        tratamiento: document.getElementById("vc_tratamiento").textContent
    };

    // Guardamos temporalmente
    sessionStorage.setItem("datosFormula", JSON.stringify(datosPDF));

    // Abrimos plantilla
    window.open("reporte_formula.html", "_blank");
};


document.getElementById("btnRegresar").onclick = () => {
    const clienteId = localStorage.getItem("clienteSeleccionado");
    if (!clienteId) {
        window.location.href = "pacientes.html";
        return;
    }
    localStorage.setItem("tutorVolver", clienteId);

    window.location.href = "pacientes.html";
};


$('#modalRegistroConsulta').on('show.bs.modal', function () {

    document.getElementById("tituloModalConsulta").textContent = "Información consulta";
    document.getElementById("headerVerConsulta").style.display = "none";
    document.getElementById("btnGuardarConsulta").style.display = "inline-block";
    document.getElementById("btnLimpiarCampos").style.display = "inline-block";
    document.getElementById("btnFinalizarConsulta").style.display = "none";

    desbloquearFormularioConsulta();
    restaurarMedicamentosEdicion();
    cargarMedicamentosInventario();
});

$('#modalRegistroConsulta').on('hidden.bs.modal', function () {
    medicamentosSeleccionados = [];
    medicamentosCache = [];
    renderListaSeleccionados();
    const inputBuscar = document.getElementById("buscarMedicamento");
    if (inputBuscar) inputBuscar.value = "";
    const resultados = document.getElementById("resultadosMedicamentos");
    if (resultados) resultados.style.display = "none";
});

// ================= CARRITO MEDICAMENTOS =================

let medicamentosCache = [];
let medicamentosSeleccionados = [];

/**
 * Carga medicamentos del inventario (categoría 1) desde Supabase.
 * Task 5.1
 */
async function cargarMedicamentosInventario() {
    try {
        const { data, error } = await supabaseClient
            .from("productos")
            .select("pr_id_producto, pr_nombre, pr_lote, pr_cantidad_disponible, pr_stock_minimo, pr_costo_compra")
            .eq("pr_cat_id_categoria", 1);

        if (error) throw new Error(error.message);

        medicamentosCache = data || [];
    } catch (err) {
        medicamentosCache = [];
        Swal.fire("Error", "No se pudieron cargar los medicamentos del inventario: " + err.message, "error");
        const inputBuscar = document.getElementById("buscarMedicamento");
        if (inputBuscar) inputBuscar.disabled = true;
    }
}

/**
 * Filtra medicamentos por nombre (mínimo 2 caracteres, case-insensitive).
 */
function buscarMedicamentoPorNombreLocal(medicamentos, termino) {
    if (!Array.isArray(medicamentos)) return [];
    if (!termino || typeof termino !== 'string') return [];
    const terminoTrimmed = termino.trim();
    if (terminoTrimmed.length < 2) return [];
    const terminoLower = terminoTrimmed.toLowerCase();
    return medicamentos.filter(m => {
        if (!m || !m.pr_nombre || typeof m.pr_nombre !== 'string') return false;
        return m.pr_nombre.toLowerCase().includes(terminoLower);
    });
}

/**
 * Agrega un medicamento al carrito o incrementa cantidad si ya existe.
 */
function agregarAlCarritoLocal(carrito, producto) {
    if (!Array.isArray(carrito)) return [];
    if (!producto || typeof producto !== 'object') return [...carrito];
    const productoId = producto.pr_id_producto;
    if (productoId == null) return [...carrito];
    const existente = carrito.find(item => item.productoId === productoId);
    if (existente) {
        return carrito.map(item =>
            item.productoId === productoId
                ? { ...item, cantidad: item.cantidad + 1 }
                : { ...item }
        );
    }
    return [
        ...carrito,
        {
            productoId: productoId,
            nombre: producto.pr_nombre || '',
            lote: producto.pr_lote || '',
            cantidad: 1,
            stockDisponible: producto.pr_cantidad_disponible || 0,
            costoUnitario: producto.pr_costo_compra || 0
        }
    ];
}

/**
 * Valida cantidad en rango [1, stockDisponible].
 */
function validarCantidadMedicamentoLocal(cantidad, stockDisponible) {
    if (typeof stockDisponible !== 'number' || !isFinite(stockDisponible) || stockDisponible <= 0) {
        return { valido: false, cantidadFinal: 0, error: "Stock no disponible" };
    }
    if (typeof cantidad !== 'number' || !isFinite(cantidad)) {
        return { valido: false, cantidadFinal: 1, error: "La cantidad debe ser un número válido" };
    }
    if (cantidad < 1) {
        return { valido: false, cantidadFinal: 1, error: "La cantidad debe ser mayor a 0" };
    }
    if (cantidad > stockDisponible) {
        return { valido: false, cantidadFinal: stockDisponible, error: `Stock máximo disponible: ${stockDisponible}` };
    }
    return { valido: true, cantidadFinal: cantidad, error: null };
}

/**
 * Elimina un item del carrito por productoId.
 */
function eliminarDelCarritoLocal(carrito, productoId) {
    if (!Array.isArray(carrito)) return [];
    if (productoId == null) return [...carrito];
    return carrito.filter(item => item.productoId !== productoId);
}

/**
 * Serializa la lista de medicamentos seleccionados a JSON.
 */
function serializarMedicamentosConsultaLocal(items) {
    if (!Array.isArray(items) || items.length === 0) return "[]";
    const mapped = items.map(item => ({
        nombre: item.nombre || '',
        lote: item.lote || '',
        cantidad: item.cantidad || 0
    }));
    return JSON.stringify(mapped);
}

/**
 * Deserializa texto de medicamentos (JSON o legacy).
 */
function deserializarMedicamentosConsultaLocal(texto) {
    if (texto == null || texto === '') return [];
    if (typeof texto !== 'string') return [];
    const trimmed = texto.trim();
    if (trimmed === '') return [];
    try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
            return parsed.map(item => ({
                nombre: item.nombre || '',
                lote: item.lote || '',
                cantidad: item.cantidad || 0
            }));
        }
        return [{ texto: trimmed }];
    } catch (e) {
        return [{ texto: trimmed }];
    }
}

/**
 * Construye objeto de movimiento de inventario para descuento por consulta.
 */
function construirMovimientoConsultaLocal(productoId, cantidad, costoUnitario, saldoResultante, idConsulta) {
    return {
        mi_pr_id_producto: productoId,
        mi_tmi_id_tipo: 4,
        mi_cantidad: cantidad,
        mi_costo_unitario: costoUnitario,
        mi_saldo_resultante: saldoResultante,
        mi_notas: "Consulta médica #" + idConsulta
    };
}

// ===== Task 5.2: Búsqueda y renderizado de resultados =====

document.addEventListener("DOMContentLoaded", function () {
    const inputBuscar = document.getElementById("buscarMedicamento");
    if (inputBuscar) {
        inputBuscar.addEventListener("input", function () {
            const termino = this.value;
            const resultados = buscarMedicamentoPorNombreLocal(medicamentosCache, termino);
            renderResultadosBusqueda(resultados);
        });

        // Cerrar dropdown al hacer click fuera
        document.addEventListener("click", function (e) {
            if (!e.target.closest("#busquedaMedicamentoWrapper")) {
                const dropdown = document.getElementById("resultadosMedicamentos");
                if (dropdown) dropdown.style.display = "none";
            }
        });
    }
});

function renderResultadosBusqueda(resultados) {
    const container = document.getElementById("resultadosMedicamentos");
    if (!container) return;

    if (!resultados || resultados.length === 0) {
        container.style.display = "none";
        container.innerHTML = "";
        return;
    }

    let html = "";
    resultados.forEach(med => {
        const sinStock = med.pr_cantidad_disponible <= 0;
        const disabledClass = sinStock ? "disabled" : "";
        const badgeSinStock = sinStock ? '<span class="badge-sin-stock">Sin stock</span>' : "";
        const stockInfo = sinStock ? "" : ` (Stock: ${med.pr_cantidad_disponible})`;

        html += `<div class="resultado-item ${disabledClass}" data-id="${med.pr_id_producto}">
            <strong>${med.pr_nombre}</strong>${badgeSinStock}<br>
            <small>Lote: ${med.pr_lote || 'N/A'}${stockInfo}</small>
        </div>`;
    });

    container.innerHTML = html;
    container.style.display = "block";

    // Event listeners para seleccionar
    container.querySelectorAll(".resultado-item:not(.disabled)").forEach(item => {
        item.addEventListener("click", function () {
            const productoId = parseInt(this.dataset.id);
            agregarMedicamentoAlCarrito(productoId);
            container.style.display = "none";
            document.getElementById("buscarMedicamento").value = "";
        });
    });
}

// ===== Task 5.3: Selección y gestión del carrito =====

function agregarMedicamentoAlCarrito(productoId) {
    const producto = medicamentosCache.find(m => m.pr_id_producto === productoId);
    if (!producto) return;

    // Verificar stock antes de agregar
    const itemExistente = medicamentosSeleccionados.find(i => i.productoId === productoId);
    if (itemExistente) {
        const validacion = validarCantidadMedicamentoLocal(itemExistente.cantidad + 1, producto.pr_cantidad_disponible);
        if (!validacion.valido) {
            Swal.fire("Atención", validacion.error, "warning");
            return;
        }
    }

    medicamentosSeleccionados = agregarAlCarritoLocal(medicamentosSeleccionados, producto);
    renderListaSeleccionados();
}

function renderListaSeleccionados() {
    const container = document.getElementById("listaMedicamentosSeleccionados");
    if (!container) return;

    if (medicamentosSeleccionados.length === 0) {
        container.innerHTML = "";
        return;
    }

    let html = "";
    medicamentosSeleccionados.forEach(item => {
        html += `<div class="med-item" data-id="${item.productoId}">
            <span class="med-nombre" title="${item.nombre} (Lote: ${item.lote})">${item.nombre}</span>
            <input type="number" class="med-cantidad" value="${item.cantidad}" min="1" max="${item.stockDisponible}" data-id="${item.productoId}">
            <button type="button" class="btn-eliminar-med" data-id="${item.productoId}" title="Eliminar">&times;</button>
        </div>`;
    });

    container.innerHTML = html;

    // Event listeners para cantidad
    container.querySelectorAll(".med-cantidad").forEach(input => {
        input.addEventListener("change", function () {
            const productoId = parseInt(this.dataset.id);
            const nuevaCantidad = parseInt(this.value);
            const item = medicamentosSeleccionados.find(i => i.productoId === productoId);
            if (!item) return;

            const validacion = validarCantidadMedicamentoLocal(nuevaCantidad, item.stockDisponible);
            if (!validacion.valido) {
                Swal.fire("Atención", validacion.error, "warning");
            }
            // Actualizar con la cantidad final (ajustada si excede)
            medicamentosSeleccionados = medicamentosSeleccionados.map(i =>
                i.productoId === productoId ? { ...i, cantidad: validacion.cantidadFinal } : i
            );
            renderListaSeleccionados();
        });
    });

    // Event listeners para eliminar
    container.querySelectorAll(".btn-eliminar-med").forEach(btn => {
        btn.addEventListener("click", function () {
            const productoId = parseInt(this.dataset.id);
            medicamentosSeleccionados = eliminarDelCarritoLocal(medicamentosSeleccionados, productoId);
            renderListaSeleccionados();
        });
    });
}


// ================= VISUALIZACIÓN MEDICAMENTOS READ-ONLY (Task 8.1) =================

/**
 * Renderiza medicamentos en modo solo lectura para "Ver Consulta".
 */
function renderMedicamentosReadOnly(textoMedicamentos) {
    const wrapper = document.getElementById("busquedaMedicamentoWrapper");
    const listaContainer = document.getElementById("listaMedicamentosSeleccionados");

    // Ocultar campo de búsqueda en modo visualización
    if (wrapper) wrapper.style.display = "none";

    if (!listaContainer) return;

    const items = deserializarMedicamentosConsultaLocal(textoMedicamentos);

    if (!items || items.length === 0) {
        listaContainer.innerHTML = '<small class="text-muted">Sin medicamentos registrados</small>';
        return;
    }

    // Verificar si es texto legacy
    if (items.length === 1 && items[0].texto) {
        listaContainer.innerHTML = `<p style="font-size:12px; white-space:pre-wrap;">${items[0].texto}</p>`;
        return;
    }

    let html = '<div class="lista-medicamentos-readonly">';
    items.forEach(item => {
        html += `<div class="med-item">
            <span class="med-nombre" title="Lote: ${item.lote}">${item.nombre} <small>(${item.lote})</small></span>
            <input type="text" class="med-cantidad" value="${item.cantidad}" readonly disabled>
        </div>`;
    });
    html += '</div>';

    listaContainer.innerHTML = html;
}

/**
 * Restaura el componente de medicamentos a modo edición.
 */
function restaurarMedicamentosEdicion() {
    const wrapper = document.getElementById("busquedaMedicamentoWrapper");
    if (wrapper) wrapper.style.display = "block";

    const inputBuscar = document.getElementById("buscarMedicamento");
    if (inputBuscar) inputBuscar.disabled = false;

    medicamentosSeleccionados = [];
    renderListaSeleccionados();
}

// ================= DESCUENTO INVENTARIO (Tasks 6.1, 6.2, 6.3) =================

/**
 * Descuenta inventario para cada medicamento de la consulta.
 * Si falla un item, revierte los anteriores (rollback).
 * Task 6.1, 6.2
 */
async function descontarInventarioConsulta(idConsulta, items) {
    const descuentosRealizados = [];

    try {
        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            // Verificar stock actual
            const { data: producto, error: errorProducto } = await supabaseClient
                .from("productos")
                .select("pr_id_producto, pr_cantidad_disponible, pr_costo_compra, pr_stock_minimo, pr_nombre")
                .eq("pr_id_producto", item.productoId)
                .single();

            if (errorProducto) {
                throw new Error(`Error al verificar stock de "${item.nombre}": ${errorProducto.message}`);
            }

            if (producto.pr_cantidad_disponible < item.cantidad) {
                throw new Error(`Stock insuficiente para "${item.nombre}". Disponible: ${producto.pr_cantidad_disponible}, Solicitado: ${item.cantidad}`);
            }

            // Calcular nuevo stock
            const nuevoStock = producto.pr_cantidad_disponible - item.cantidad;

            // Construir movimiento de kardex
            const movimiento = construirMovimientoConsultaLocal(
                item.productoId,
                item.cantidad,
                producto.pr_costo_compra || item.costoUnitario,
                nuevoStock,
                idConsulta
            );

            // Insertar movimiento de kardex
            const { error: errorMovimiento } = await supabaseClient
                .from("movimientos_inventario")
                .insert(movimiento);

            if (errorMovimiento) {
                throw new Error(`Error al registrar movimiento para "${item.nombre}": ${errorMovimiento.message}`);
            }

            // Actualizar stock del producto
            const { error: errorUpdate } = await supabaseClient
                .from("productos")
                .update({ pr_cantidad_disponible: nuevoStock })
                .eq("pr_id_producto", item.productoId);

            if (errorUpdate) {
                throw new Error(`Error al actualizar stock de "${item.nombre}": ${errorUpdate.message}`);
            }

            descuentosRealizados.push({
                productoId: item.productoId,
                nombre: item.nombre,
                cantidad: item.cantidad,
                stockAnterior: producto.pr_cantidad_disponible,
                nuevoStock: nuevoStock,
                stockMinimo: producto.pr_stock_minimo
            });
        }

        // Task 6.3: Verificar stock bajo después de descontar
        const medicamentosStockBajo = descuentosRealizados.filter(d =>
            d.nuevoStock <= (d.stockMinimo || 0)
        );

        if (medicamentosStockBajo.length > 0) {
            const listaBajo = medicamentosStockBajo.map(m =>
                `• ${m.nombre} (Stock: ${m.nuevoStock})`
            ).join("<br>");

            Swal.fire({
                title: "⚠️ Stock bajo",
                html: `Los siguientes medicamentos quedaron con stock bajo:<br><br>${listaBajo}`,
                icon: "warning",
                confirmButtonText: "Entendido"
            });
        }

    } catch (err) {
        // Task 6.2: Rollback - revertir descuentos realizados
        if (descuentosRealizados.length > 0) {
            await rollbackDescuentos(descuentosRealizados, idConsulta);
        }

        Swal.fire("Error de inventario", err.message, "error");
    }
}

/**
 * Revierte descuentos realizados con ajuste positivo (mi_tmi_id_tipo = 3).
 * Task 6.2
 */
async function rollbackDescuentos(descuentosRealizados, idConsulta) {
    for (const descuento of descuentosRealizados) {
        try {
            // Insertar movimiento de ajuste positivo para revertir
            const movimientoReverso = {
                mi_pr_id_producto: descuento.productoId,
                mi_tmi_id_tipo: 3, // ajuste_positivo
                mi_cantidad: descuento.cantidad,
                mi_costo_unitario: 0,
                mi_saldo_resultante: descuento.stockAnterior,
                mi_notas: "Reverso - Consulta médica #" + idConsulta
            };

            await supabaseClient
                .from("movimientos_inventario")
                .insert(movimientoReverso);

            // Restaurar stock anterior
            await supabaseClient
                .from("productos")
                .update({ pr_cantidad_disponible: descuento.stockAnterior })
                .eq("pr_id_producto", descuento.productoId);

        } catch (rollbackErr) {
            console.error("Error en rollback para producto " + descuento.nombre, rollbackErr);
        }
    }
}
