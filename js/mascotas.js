let mascota = null;
let consultaActualId = null;

// ================= QUERY PARAMS FROM AGENDA =================

function leerParametrosCita() {
    const params = new URLSearchParams(window.location.search);
    const citaId = params.get('citaId');
    if (!citaId) return null;
    return {
        citaId: parseInt(citaId),
        clienteId: parseInt(params.get('clienteId')),
        mascotaId: parseInt(params.get('mascotaId')),
        vetDoc: parseInt(params.get('vetDoc')),
        fecha: params.get('fecha')
    };
}


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
    inicializarCheckboxesExclusivos();
});

// ================= CHECKBOXES MUTUAMENTE EXCLUSIVOS (SI/NO) =================

function inicializarCheckboxesExclusivos() {
    document.querySelectorAll('[data-group]').forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            if (this.checked) {
                // Desmarcar los otros checkboxes del mismo grupo
                const grupo = this.dataset.group;
                document.querySelectorAll(`[data-group="${grupo}"]`).forEach(otro => {
                    if (otro !== this) {
                        otro.checked = false;
                    }
                });
            }
        });
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    
    // Check if coming from agenda with cita params
    const citaParams = leerParametrosCita();
    if (citaParams) {
        // Store citaId for later use when saving consultation
        localStorage.setItem('citaIdPendiente', citaParams.citaId);
        // Use mascotaId from query params
        localStorage.setItem("mascotaId", citaParams.mascotaId);
    }

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

    // Mostrar/ocultar botón de esterilizado según estado
    const btnEsterilizado = document.getElementById("btnToggleEsterilizado");
    if (btnEsterilizado) {
        btnEsterilizado.style.display = mascota.dm_esterilizado.toUpperCase() === "S" ? "none" : "";
    }
    const fecha = mascota.dm_fecha_nacimiento.split(" ")[0]; // yyyy-mm-dd
    const [year, month, day] = fecha.split("-");

    document.getElementById("fm_fechaNacimiento").textContent =
        `${day}/${month}/${year}`;



    btnGenerarConsulta.disabled = false;
    document.getElementById("btnHistorialMedico").disabled = false;
    cargarConsultas();
    
    // If coming from agenda, auto-open consultation modal
    if (citaParams) {
        document.getElementById("dm_dc_id_cliente").value = mascota.dm_dc_id_cliente;
        document.getElementById("dm_id_mascota").value = mascota.dm_id_mascota;
        limpiarCamposConsulta();
        $('#modalRegistroConsulta').modal('show');
    }
});



document.getElementById("btnGenerarConsulta").onclick = () => {
    document.getElementById("dm_dc_id_cliente").value = mascota.dm_dc_id_cliente;
    document.getElementById("dm_id_mascota").value = mascota.dm_id_mascota;
    limpiarCamposConsulta();
    $('#modalRegistroConsulta').modal('show');
};

// ================= TOGGLE ESTERILIZADO =================
document.getElementById("btnToggleEsterilizado").addEventListener("click", async function () {
    if (!mascota || !mascota.dm_id_mascota) return;

    const estadoActual = mascota.dm_esterilizado?.toUpperCase() === "S" ? "S" : "N";

    // Solo permitir cambiar si está en "N" (no esterilizado)
    if (estadoActual === "S") {
        await Swal.fire({ title: "Info", text: "Esta mascota ya está marcada como esterilizada.", icon: "info" });
        return;
    }

    const result = await Swal.fire({
        title: "¿Marcar esta mascota como esterilizada?",
        text: "Esta acción no se puede revertir.",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Sí, esterilizada",
        cancelButtonText: "Cancelar"
    });

    if (!result.isConfirmed) return;

    const { error } = await supabaseClient
        .from("datos_mascota")
        .update({ dm_esterilizado: "S" })
        .eq("dm_id_mascota", mascota.dm_id_mascota);

    if (error) {
        await Swal.fire({ title: "Error", text: error.message, icon: "error" });
        return;
    }

    mascota.dm_esterilizado = "S";
    document.getElementById("fm_esterilizado").innerHTML =
        '<span style="color:green;font-weight:bold;">✓</span>';

    // Ocultar botón ya que no se puede revertir
    this.style.display = "none";

    await Swal.fire({
        title: "Marcada como esterilizada",
        icon: "success",
        timer: 1500,
        showConfirmButton: false
    });
});

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

            // Pre-orden: Ya no se descuenta inventario al guardar consulta.
            // El descuento se realiza al completar la venta en el módulo POS.
            // if (medicamentosSeleccionados.length > 0) {
            //     await descontarInventarioConsulta(idConsulta, medicamentosSeleccionados);
            // }

            // Generar pre-orden con los medicamentos seleccionados
            await generarPreordenConsulta(idConsulta, medicamentosSeleccionados);

            // Registrar vacunas aplicadas en info_vacunacion
            await registrarVacunasAplicadas(medicamentosSeleccionados);
            
            // If there's a pending citaId from agenda, update the cita to Finalizada
            const citaIdPendiente = localStorage.getItem('citaIdPendiente');
            if (citaIdPendiente) {
                await supabaseClient
                    .from("citas")
                    .update({ 
                        ct_eci_id_estado_cita: 2,
                        ct_cm_id_consulta: idConsulta
                    })
                    .eq("ct_id_cita", parseInt(citaIdPendiente));
                
                localStorage.removeItem('citaIdPendiente');
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
        cm_ec_id_estado,
        cm_formula,
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

        const botonFinalizar = renderBotonFinalizar(c);

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
                    title="Formular"
                    ${c.cm_formula ? 'style="display:none;"' : ''}>
                    📄
                </button>
                ${botonFinalizar}
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
    prurito: "e_pruito",
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

        consultaActualId = parseInt(id);

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

        setTimeout(async () => {

            // =========================
            // 🔹 LLENAR CAMPOS
            // =========================

            cm_motivo_consulta.value = consulta.cm_motivo_consulta || "";
            cm_observaciones.value = consulta.cm_observaciones || "";

            cm_diagnosticos_diferenciales.value = consulta.cm_diagnosticos_diferenciales || "";
            cm_diagnostico_definitivo.value = consulta.cm_diagnostico_definitivo || "";

            // Task 8.1: Mostrar medicamentos en modo lectura
            await renderMedicamentosReadOnly(consulta.cm_medicamentos_aplicados);

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
            e_descripcion_pruito.value = ecto?.e_descripcion_pruito || "";

            // =========================
            // 🔹 FECHA Y ESTADO
            // =========================

            let fechaFormateada = "-";
            if (consulta.cm_fecha_consulta) {
                const [y, m, d] = consulta.cm_fecha_consulta.split(" ")[0].split("-");
                fechaFormateada = `${d}/${m}/${y}`;
            }

            document.getElementById("vc_fecha").textContent = fechaFormateada;
            document.getElementById("vc_estado").textContent = estadoTexto;

            // =========================
            // 🔹 UI
            // =========================

            document.getElementById("tituloModalConsulta").textContent = "Detalle consulta";
            document.getElementById("headerVerConsulta").style.display = "block";

            document.getElementById("btnGuardarConsulta").style.display = "none";
            document.getElementById("btnLimpiarCampos").style.display = "none";
            document.getElementById("btnVerSeguimientos").style.display = "inline-block";

            // Mostrar botón de imprimir fórmula si la consulta tiene fórmula
            const btnImprimirFormula = document.getElementById("btnImprimirFormula");
            if (btnImprimirFormula) {
                btnImprimirFormula.style.display = consulta.cm_formula ? "inline-block" : "none";
            }

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

    if (!consultaActualId) {
        Swal.fire("Error", "No hay consulta seleccionada", "error");
        return;
    }

    // 🔹 Traer fórmula de la consulta
    const { data: consulta } = await supabaseClient
        .from("consulta_medica")
        .select("cm_formula")
        .eq("cm_id_consulta", consultaActualId)
        .single();

    if (!consulta || !consulta.cm_formula) {
        Swal.fire("Info", "Esta consulta no tiene fórmula registrada", "info");
        return;
    }

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
        tratamiento: consulta.cm_formula
    };

    // Guardamos temporalmente
    sessionStorage.setItem("datosFormula", JSON.stringify(datosPDF));

    // Abrimos plantilla como popup
    window.open("reporte_formula.html", "FormulaVeterinaria", "width=520,height=780,scrollbars=no,resizable=no,menubar=no,toolbar=no,location=no,status=no");
};

// Botón imprimir fórmula dentro del modal de detalle consulta
document.getElementById("btnImprimirFormula").onclick = function () {
    document.getElementById("btnDescargarFormula").click();
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
    document.getElementById("btnImprimirFormula").style.display = "none";
    document.getElementById("btnVerSeguimientos").style.display = "none";

    desbloquearFormularioConsulta();
    restaurarMedicamentosEdicion();
    cargarMedicamentosInventario();

    // Evento para recalcular presupuesto al cambiar valor de consulta
    const valorConsultaInput = document.getElementById("cm_valor_consulta");
    if (valorConsultaInput) {
        valorConsultaInput.removeEventListener("input", actualizarPresupuestoDOM);
        valorConsultaInput.addEventListener("input", actualizarPresupuestoDOM);
    }
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
            .select("pr_id_producto, pr_nombre, pr_lote, pr_cantidad_disponible, pr_stock_minimo, pr_costo_compra, pr_precio_venta, pr_cat_id_categoria, pr_unidad_medida")
            .in("pr_cat_id_categoria", [1, 4]);

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
    if (terminoTrimmed.length < 1) return [];
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
            costoUnitario: producto.pr_costo_compra || 0,
            precioVenta: producto.pr_precio_venta || 0,
            unidadMedida: producto.pr_unidad_medida || ''
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
 * Calcula el presupuesto total de la consulta.
 * @param {number} valorConsulta - Valor base de la consulta
 * @param {Array<{precioVenta: number, cantidad: number}>} items - Medicamentos del carrito
 * @returns {number} Total con 2 decimales
 */
function calcularPresupuestoTotal(valorConsulta, items) {
    const vc = (typeof valorConsulta === 'number' && isFinite(valorConsulta)) ? valorConsulta : 0;
    if (!Array.isArray(items) || items.length === 0) {
        return Math.round(vc * 100) / 100;
    }
    const sumaMedicamentos = items.reduce((acc, item) => {
        const precio = (typeof item.precioVenta === 'number' && isFinite(item.precioVenta)) ? item.precioVenta : 0;
        const cantidad = (typeof item.cantidad === 'number' && isFinite(item.cantidad)) ? item.cantidad : 0;
        return acc + (precio * cantidad);
    }, 0);
    return Math.round((vc + sumaMedicamentos) * 100) / 100;
}

/**
 * Recalcula y actualiza el campo cm_presupuesto en el DOM.
 */
function actualizarPresupuestoDOM() {
    const valorConsultaInput = document.getElementById("cm_valor_consulta");
    const presupuestoInput = document.getElementById("cm_presupuesto");
    if (!presupuestoInput) return;
    const valorConsulta = valorConsultaInput ? parseFloat(valorConsultaInput.value) || 0 : 0;
    const total = calcularPresupuestoTotal(valorConsulta, medicamentosSeleccionados);
    presupuestoInput.value = total.toFixed(2);
}

/**
 * Serializa la lista de medicamentos seleccionados a JSON.
 */
function serializarMedicamentosConsultaLocal(items) {
    if (!Array.isArray(items) || items.length === 0) return "[]";
    const mapped = items.map(item => ({
        nombre: item.nombre || '',
        lote: item.lote || '',
        cantidad: item.cantidad || 0,
        unidad: item.unidadMedida || ''
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
            if (!termino || termino.trim().length < 1) {
                // Mostrar todos los medicamentos cuando el campo está vacío
                renderResultadosBusqueda(medicamentosCache);
                return;
            }
            const resultados = buscarMedicamentoPorNombreLocal(medicamentosCache, termino);
            renderResultadosBusqueda(resultados);
        });

        // Mostrar lista completa al hacer focus
        inputBuscar.addEventListener("focus", function () {
            if (!this.value || this.value.trim() === '') {
                renderResultadosBusqueda(medicamentosCache);
            }
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
    actualizarPresupuestoDOM();
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
        const unidad = item.unidadMedida ? ` (${item.unidadMedida})` : '';
        html += `<div class="med-item" data-id="${item.productoId}">
            <span class="med-nombre" title="${item.nombre} (Lote: ${item.lote})">${item.nombre}${unidad}</span>
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
            actualizarPresupuestoDOM();
        });
    });

    // Event listeners para eliminar
    container.querySelectorAll(".btn-eliminar-med").forEach(btn => {
        btn.addEventListener("click", function () {
            const productoId = parseInt(this.dataset.id);
            medicamentosSeleccionados = eliminarDelCarritoLocal(medicamentosSeleccionados, productoId);
            renderListaSeleccionados();
            actualizarPresupuestoDOM();
        });
    });
}


// ================= VISUALIZACIÓN MEDICAMENTOS READ-ONLY (Task 8.1) =================

/**
 * Renderiza medicamentos en modo solo lectura para "Ver Consulta".
 */
async function renderMedicamentosReadOnly(textoMedicamentos) {
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

    // Buscar unidades de medida desde la tabla productos por nombre
    const nombres = items.map(i => i.nombre).filter(Boolean);
    let unidadesMap = {};
    if (nombres.length > 0) {
        const { data: productos } = await supabaseClient
            .from("productos")
            .select("pr_nombre, pr_unidad_medida")
            .in("pr_nombre", nombres);
        if (productos) {
            productos.forEach(p => {
                if (p.pr_unidad_medida) unidadesMap[p.pr_nombre] = p.pr_unidad_medida;
            });
        }
    }

    let html = '<div class="lista-medicamentos-readonly">';
    items.forEach(item => {
        const unidad = item.unidad || unidadesMap[item.nombre] || '';
        const unidadDisplay = unidad ? ` (${unidad})` : '';
        html += `<div class="med-item">
            <span class="med-nombre" title="Lote: ${item.lote}">${item.nombre}${unidadDisplay} <small>(${item.lote})</small></span>
            <input type="text" class="med-cantidad" value="${item.cantidad}${unidad ? ' ' + unidad : ''}" readonly disabled>
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


// ================= REGISTRO DE VACUNAS APLICADAS =================

/**
 * Registra en info_vacunacion los medicamentos que pertenecen a la categoría Vacunas (4).
 */
async function registrarVacunasAplicadas(items) {
    if (!Array.isArray(items) || items.length === 0) return;

    const idMascota = parseInt(document.getElementById("dm_id_mascota").value);
    if (!idMascota) return;

    // Obtener los IDs de productos del carrito
    const productoIds = items.map(i => i.productoId).filter(Boolean);
    if (productoIds.length === 0) return;

    // Consultar cuáles pertenecen a la categoría Vacunas (4)
    const { data: productosVacuna, error } = await supabaseClient
        .from("productos")
        .select("pr_id_producto, pr_nombre")
        .in("pr_id_producto", productoIds)
        .eq("pr_cat_id_categoria", 4);

    if (error || !productosVacuna || productosVacuna.length === 0) return;

    // Insertar cada vacuna en info_vacunacion con cantidad
    const registros = productosVacuna.map(v => {
        const itemCarrito = items.find(i => i.productoId === v.pr_id_producto);
        return {
            iv_dm_id_mascota: idMascota,
            iv_fecha_vacunacion: new Date().toISOString().split('T')[0],
            iv_pr_id_producto: v.pr_id_producto,
            iv_cantidad: itemCarrito ? itemCarrito.cantidad : 1
        };
    });

    const { error: errInsert } = await supabaseClient
        .from("info_vacunacion")
        .insert(registros);

    if (errInsert) {
        console.error("Error registrando vacunas:", errInsert);
    }
}


// ================= PRE-ORDEN DE CONSULTA =================

/**
 * Construye el objeto de cabecera de pre-orden.
 */
function construirPreordenConsulta(idConsulta, idMascota, idCliente, valorConsulta, total) {
    return {
        po_cm_id_consulta: idConsulta,
        po_dm_id_mascota: idMascota,
        po_dc_id_cliente: idCliente,
        po_valor_consulta: valorConsulta,
        po_total: total,
        po_estado: "pendiente",
        po_fecha_creacion: new Date().toLocaleString("sv-SE", { timeZone: "America/Bogota" })
    };
}

/**
 * Construye los objetos de detalle de pre-orden.
 */
function construirPreordenDetalles(idPreorden, items) {
    if (!Array.isArray(items) || items.length === 0) return [];
    return items.map(item => ({
        pd_po_id_preorden: idPreorden,
        pd_pr_id_producto: item.productoId,
        pd_cantidad: item.cantidad,
        pd_precio_unitario: item.precioVenta || 0,
        pd_subtotal: (item.precioVenta || 0) * item.cantidad
    }));
}

/**
 * Genera la pre-orden después de guardar la consulta.
 */
async function generarPreordenConsulta(idConsulta, items) {
    try {
        const idMascota = parseInt(document.getElementById("dm_id_mascota").value);
        const idCliente = parseInt(document.getElementById("dm_dc_id_cliente").value);
        const valorConsultaInput = document.getElementById("cm_valor_consulta");
        const valorConsulta = valorConsultaInput ? parseFloat(valorConsultaInput.value) || 0 : 0;
        const total = calcularPresupuestoTotal(valorConsulta, items);

        const preordenData = construirPreordenConsulta(idConsulta, idMascota, idCliente, valorConsulta, total);

        const { data: preorden, error: errorPreorden } = await supabaseClient
            .from("preorden_consulta")
            .insert(preordenData)
            .select("po_id_preorden")
            .single();

        if (errorPreorden) throw new Error(errorPreorden.message);

        // Insertar detalles si hay medicamentos
        if (items.length > 0) {
            const detalles = construirPreordenDetalles(preorden.po_id_preorden, items);
            const { error: errorDetalles } = await supabaseClient
                .from("preorden_detalle")
                .insert(detalles);

            if (errorDetalles) throw new Error(errorDetalles.message);
        }

    } catch (err) {
        console.error("Error creando pre-orden:", err);
        await Swal.fire({
            title: "Advertencia",
            text: "La consulta se guardó correctamente pero la pre-orden no pudo ser creada. Contacte al administrador.",
            icon: "warning"
        });
    }
}


// ================= FÓRMULA MÉDICA =================

async function abrirModalFormula(consultaId) {
    document.getElementById("formula_consulta_id").value = consultaId;
    const { data } = await supabaseClient
        .from("consulta_medica")
        .select("cm_formula")
        .eq("cm_id_consulta", consultaId)
        .single();
    document.getElementById("formula_texto").value = data?.cm_formula || "";
    $('#modalFormula').modal('show');
}

document.getElementById("btnGuardarFormula").addEventListener("click", async function () {
    const consultaId = document.getElementById("formula_consulta_id").value;
    const formula = document.getElementById("formula_texto").value.trim();

    const { error } = await supabaseClient
        .from("consulta_medica")
        .update({ cm_formula: formula })
        .eq("cm_id_consulta", parseInt(consultaId));

    if (error) {
        await Swal.fire({ title: "Error", text: error.message, icon: "error" });
        return;
    }

    await Swal.fire({ title: "Fórmula guardada", icon: "success", timer: 1500, showConfirmButton: false });
    $('#modalFormula').modal('hide');
});

// Wire the "Formular" button in the consultations table
document.addEventListener("click", function (e) {
    if (e.target.classList.contains("btn-formular")) {
        const consultaId = e.target.dataset.id;
        if (consultaId) abrirModalFormula(parseInt(consultaId));
    }
});

// ================= SEGUIMIENTOS =================

let seguimientoConsultaId = null;

function truncarTexto(texto, max) {
    if (!texto || typeof texto !== 'string') return '';
    if (texto.length <= max) return texto;
    return texto.substring(0, max) + '...';
}

async function abrirModalSeguimientos(consultaId) {
    seguimientoConsultaId = consultaId;

    // Check if consultation is finalized - hide "Nuevo Seguimiento" button if so
    const { data: consultaData } = await supabaseClient
        .from("consulta_medica")
        .select("cm_ec_id_estado")
        .eq("cm_id_consulta", consultaId)
        .single();

    const btnNuevoSeg = document.querySelector('#modalSeguimientos .modal-footer .btn-success');
    if (consultaData && consultaData.cm_ec_id_estado === 2) {
        if (btnNuevoSeg) btnNuevoSeg.style.display = 'none';
    } else {
        if (btnNuevoSeg) btnNuevoSeg.style.display = 'inline-block';
    }

    const { data, error } = await supabaseClient
        .from("seguimiento")
        .select("s_id_seguimiento, s_seguimiento, s_fecha_seguimiento")
        .eq("s_cm_id_consulta", consultaId)
        .order("s_fecha_seguimiento", { ascending: false });

    const tbody = document.getElementById("tablaSeguimientos");

    if (error || !data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">No hay seguimientos registrados</td></tr>`;
    } else {
        tbody.innerHTML = "";
        data.forEach(s => {
            const fecha = s.s_fecha_seguimiento || "-";
            const texto = truncarTexto(s.s_seguimiento, 50);
            tbody.innerHTML += `
                <tr class="text-center">
                    <td>${fecha}</td>
                    <td>${texto}</td>
                    <td>
                        <button type="button" class="btn btn-success btn-sm btn-ver-seguimiento" data-id="${s.s_id_seguimiento}">
                            Ver detalle
                        </button>
                    </td>
                </tr>`;
        });
    }

    $('#modalSeguimientos').modal('show');
}

async function verDetalleSeguimiento(seguimientoId) {
    const { data: seg } = await supabaseClient
        .from("seguimiento")
        .select("*")
        .eq("s_id_seguimiento", seguimientoId)
        .single();

    if (!seg) return;

    document.getElementById("detSeg_fecha").textContent = seg.s_fecha_seguimiento || "-";
    document.getElementById("detSeg_texto").textContent = seg.s_seguimiento || "";
    document.getElementById("detSeg_formula").textContent = seg.s_formula || "Sin fórmula";

    // Load adjuntos
    const { data: adjuntos } = await supabaseClient
        .from("adjuntos")
        .select("a_id_adjunto, a_nombre_archivo, a_tipo_archivo, a_base64")
        .eq("a_s_id_seguimiento", seguimientoId);

    const adjuntosContainer = document.getElementById("detSeg_adjuntos");
    if (!adjuntos || adjuntos.length === 0) {
        adjuntosContainer.innerHTML = '<p class="text-muted">Sin adjuntos</p>';
    } else {
        let html = '<ul class="list-unstyled">';
        adjuntos.forEach(a => {
            html += `<li class="mb-1">
                <a href="data:${a.a_tipo_archivo};base64,${a.a_base64}" download="${a.a_nombre_archivo}" class="btn btn-sm btn-outline-success">
                    📎 ${a.a_nombre_archivo}
                </a>
            </li>`;
        });
        html += '</ul>';
        adjuntosContainer.innerHTML = html;
    }

    $('#modalDetalleSeguimiento').modal('show');
}

// Wire "Ver detalle" button in seguimientos table
document.addEventListener("click", function (e) {
    if (e.target.classList.contains("btn-ver-seguimiento")) {
        const id = e.target.dataset.id;
        if (id) verDetalleSeguimiento(parseInt(id));
    }
});

// Wire "Ver Seguimientos" button in consultation detail modal
document.getElementById("btnVerSeguimientos").addEventListener("click", function () {
    if (consultaActualId) {
        abrirModalSeguimientos(consultaActualId);
    }
});

// Fix: Restore scroll when nested modals close (Bootstrap removes modal-open from body)
$('#modalSeguimientos').on('hidden.bs.modal', function () {
    if ($('.modal.show').length > 0) {
        $('body').addClass('modal-open');
    }
});

$('#modalDetalleSeguimiento').on('hidden.bs.modal', function () {
    if ($('.modal.show').length > 0) {
        $('body').addClass('modal-open');
    }
});

$('#modalNuevoSeguimiento').on('hidden.bs.modal', function () {
    if ($('.modal.show').length > 0) {
        $('body').addClass('modal-open');
    }
});

function abrirModalNuevoSeguimiento() {
    // Block if consultation is finalized
    document.getElementById("nuevoSeg_texto").value = "";
    document.getElementById("nuevoSeg_formula").value = "";
    document.getElementById("nuevoSeg_adjuntos").value = "";
    archivosSeleccionados = []; // Clear file list
    renderListaArchivos();
    $('#modalNuevoSeguimiento').modal('show');
}

// Validate files on selection (reject executables immediately)
let archivosSeleccionados = []; // Array to store valid files

document.getElementById("nuevoSeg_adjuntos").addEventListener("change", function() {
    const archivos = this.files;
    for (let i = 0; i < archivos.length; i++) {
        const validacion = validarArchivoAdjunto(archivos[i]);
        if (!validacion.valido) {
            Swal.fire({ title: "Archivo no permitido", text: validacion.error, icon: "error" });
        } else {
            // Add valid file to the list (avoid duplicates by name)
            const yaExiste = archivosSeleccionados.some(f => f.name === archivos[i].name && f.size === archivos[i].size);
            if (!yaExiste) {
                archivosSeleccionados.push(archivos[i]);
            }
        }
    }
    this.value = ""; // Clear input so user can select more files
    renderListaArchivos();
});

function renderListaArchivos() {
    const container = document.getElementById("listaArchivosSeleccionados");
    if (!archivosSeleccionados || archivosSeleccionados.length === 0) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    let html = '';
    archivosSeleccionados.forEach((file, idx) => {
        const extension = file.name.split('.').pop().toUpperCase();
        const tamano = (file.size / 1024).toFixed(1);
        html += `
            <div class="d-flex align-items-center justify-content-between mb-1" style="font-size:12px;">
                <span>📎 <strong>${file.name}</strong> <small class="text-muted">(.${extension} - ${tamano} KB)</small></span>
                <button type="button" class="btn btn-sm btn-danger btn-eliminar-archivo" data-idx="${idx}" style="padding:0px 5px; font-size:10px; line-height:1.4;">✕</button>
            </div>
        `;
    });
    container.innerHTML = html;
    
    // Wire delete buttons
    container.querySelectorAll(".btn-eliminar-archivo").forEach(btn => {
        btn.addEventListener("click", function() {
            const idx = parseInt(this.dataset.idx);
            archivosSeleccionados.splice(idx, 1);
            renderListaArchivos();
        });
    });
}

function validarArchivoAdjunto(file) {
    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE) {
        return { valido: false, error: `El archivo "${file.name}" excede 5 MB` };
    }
    // Block executable files
    const extensionesProhibidas = ['.exe', '.bat', '.cmd', '.msi', '.com', '.scr', '.pif', '.vbs', '.js', '.ws', '.wsf'];
    const tiposProhibidos = ['application/x-msdownload', 'application/x-msdos-program', 'application/x-executable'];
    const extension = '.' + file.name.split('.').pop().toLowerCase();
    if (extensionesProhibidas.includes(extension)) {
        return { valido: false, error: `No se permiten archivos ejecutables (${file.name})` };
    }
    if (tiposProhibidos.includes(file.type)) {
        return { valido: false, error: `No se permiten archivos ejecutables (${file.name})` };
    }
    return { valido: true, error: null };
}

function convertirArchivoABase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = () => reject(new Error(`Error al procesar archivo "${file.name}"`));
        reader.readAsDataURL(file);
    });
}

function validarTextoSeguimiento(texto) {
    if (!texto || typeof texto !== 'string' || !texto.trim()) {
        return { valido: false, error: 'El campo seguimiento es obligatorio' };
    }
    return { valido: true, error: null };
}

async function guardarSeguimiento() {
    const texto = document.getElementById("nuevoSeg_texto").value;
    const formula = document.getElementById("nuevoSeg_formula").value.trim();

    // Verify consultaId is set
    if (!seguimientoConsultaId) {
        await Swal.fire({ title: "Error", text: "No se ha seleccionado una consulta. Cierre y vuelva a abrir los seguimientos.", icon: "error" });
        return;
    }

    // Validate text
    const validacionTexto = validarTextoSeguimiento(texto);
    if (!validacionTexto.valido) {
        await Swal.fire({ title: "Error", text: validacionTexto.error, icon: "error" });
        return;
    }

    // Insert seguimiento
    const nuevoSeguimiento = {
        s_cm_id_consulta: seguimientoConsultaId,
        s_seguimiento: texto.trim(),
        s_formula: formula || null,
        s_fecha_seguimiento: new Date().toISOString().split('T')[0]
    };

    const { data: segData, error: segError } = await supabaseClient
        .from("seguimiento")
        .insert(nuevoSeguimiento)
        .select("s_id_seguimiento")
        .single();

    if (segError) {
        await Swal.fire({ title: "Error", text: segError.message, icon: "error" });
        return;
    }

    // Insert adjuntos from archivosSeleccionados array
    if (archivosSeleccionados.length > 0) {
        try {
            for (let i = 0; i < archivosSeleccionados.length; i++) {
                const file = archivosSeleccionados[i];
                const base64 = await convertirArchivoABase64(file);
                const adjunto = {
                    a_s_id_seguimiento: segData.s_id_seguimiento,
                    a_nombre_archivo: file.name,
                    a_tipo_archivo: file.type,
                    a_base64: base64
                };
                const { error: adjError } = await supabaseClient
                    .from("adjuntos")
                    .insert(adjunto);
                if (adjError) throw new Error(adjError.message);
            }
        } catch (err) {
            await Swal.fire({ title: "Advertencia", text: "Seguimiento guardado pero error en adjuntos: " + err.message, icon: "warning" });
            $('#modalNuevoSeguimiento').modal('hide');
            archivosSeleccionados = [];
            renderListaArchivos();
            await abrirModalSeguimientos(seguimientoConsultaId);
            return;
        }
    }

    await Swal.fire({ title: "Seguimiento guardado", icon: "success", timer: 1500, showConfirmButton: false });
    $('#modalNuevoSeguimiento').modal('hide');
    archivosSeleccionados = [];
    renderListaArchivos();
    await abrirModalSeguimientos(seguimientoConsultaId);
}

// ================= FINALIZAR CONSULTA DESDE TABLA =================

function puedeFinalizarConsulta(estadoActual) {
    return estadoActual === 1;
}

function renderBotonFinalizar(consulta) {
    if (consulta.cm_ec_id_estado === 1) {
        return `<button type="button" class="btn btn-warning btn-accion btn-finalizar-consulta" data-id="${consulta.cm_id_consulta}" title="Finalizar consulta">🔒</button>`;
    }
    return '';
}

async function finalizarConsultaDesdeTabla(consultaId) {
    const result = await Swal.fire({
        title: "¿Finalizar consulta?",
        text: "Esta acción cambiará el estado a Finalizada.",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Sí, finalizar",
        cancelButtonText: "Cancelar"
    });
    if (!result.isConfirmed) return;

    const { error } = await supabaseClient
        .from("consulta_medica")
        .update({ cm_ec_id_estado: 2 })
        .eq("cm_id_consulta", consultaId);

    if (error) {
        await Swal.fire({ title: "Error", text: error.message, icon: "error" });
        return;
    }

    await Swal.fire({ title: "Consulta finalizada", icon: "success", timer: 1500, showConfirmButton: false });
    cargarConsultas();
}

// Wire "Finalizar" button in consultations table
document.addEventListener("click", function (e) {
    if (e.target.classList.contains("btn-finalizar-consulta")) {
        const consultaId = e.target.dataset.id;
        if (consultaId) finalizarConsultaDesdeTabla(parseInt(consultaId));
    }
});

// ================= HISTORIAL MÉDICO =================

// Abrir modal de fechas al hacer clic en el botón
document.getElementById("btnHistorialMedico").addEventListener("click", function () {
    document.getElementById("historial_fecha_inicio").value = "";
    document.getElementById("historial_fecha_fin").value = "";
    document.getElementById("historial_error_fechas").style.display = "none";
    document.getElementById("historial_error_fechas").textContent = "";
    $('#modalHistorialFechas').modal('show');
});

// Generar historial al confirmar fechas
document.getElementById("btnGenerarHistorial").addEventListener("click", async function () {
    const fechaInicio = document.getElementById("historial_fecha_inicio").value;
    const fechaFin = document.getElementById("historial_fecha_fin").value;
    const errorDiv = document.getElementById("historial_error_fechas");

    // Validar fechas
    const validacion = validarRangoFechasHistorialLocal(fechaInicio, fechaFin);
    if (!validacion.valido) {
        errorDiv.textContent = validacion.error;
        errorDiv.style.display = "block";
        return;
    }

    errorDiv.style.display = "none";
    $('#modalHistorialFechas').modal('hide');

    await generarHistorialMedico(mascota.dm_id_mascota, fechaInicio, validacion.fechaFinEfectiva);
});

function validarRangoFechasHistorialLocal(fechaInicio, fechaFin) {
    if (!fechaInicio || !fechaInicio.trim()) {
        return { valido: false, error: 'La fecha inicial es obligatoria', fechaFinEfectiva: '' };
    }

    const hoy = new Date();
    const fechaHoy = hoy.getFullYear() + '-' +
        String(hoy.getMonth() + 1).padStart(2, '0') + '-' +
        String(hoy.getDate()).padStart(2, '0');

    const fechaFinEfectiva = (fechaFin && fechaFin.trim()) ? fechaFin.trim() : fechaHoy;

    if (fechaInicio.trim() > fechaFinEfectiva) {
        return { valido: false, error: 'La fecha inicial debe ser anterior o igual a la fecha final', fechaFinEfectiva };
    }

    return { valido: true, error: null, fechaFinEfectiva };
}

async function consultarConsultasMedicas(mascotaId, fechaInicio, fechaFin) {
    const { data: consultas, error } = await supabaseClient
        .from("consulta_medica")
        .select("*")
        .eq("cm_dm_id_mascota", mascotaId)
        .gte("cm_fecha_consulta", fechaInicio)
        .lte("cm_fecha_consulta", fechaFin + " 23:59:59")
        .order("cm_fecha_consulta", { ascending: true });

    if (error) throw new Error("Error al consultar consultas médicas: " + error.message);
    if (!consultas || consultas.length === 0) return [];

    const ids = consultas.map(c => c.cm_id_consulta);

    // Consultar datos asociados en paralelo
    const [examenesRes, ectoRes, planesRes] = await Promise.all([
        supabaseClient.from("examen_fisico").select("*").in("ef_cm_id_consulta", ids),
        supabaseClient.from("ectoparasitos").select("*").in("e_cm_id_consulta", ids),
        supabaseClient.from("plan_diagnostico").select("*").in("pd_cm_id_consulta", ids)
    ]);

    const examenes = examenesRes.data || [];
    const ectoparasitos = ectoRes.data || [];
    const planes = planesRes.data || [];

    // Obtener unidades de medida de todos los medicamentos mencionados
    const todosNombres = new Set();
    consultas.forEach(c => {
        if (c.cm_medicamentos_aplicados) {
            try {
                const meds = JSON.parse(c.cm_medicamentos_aplicados);
                if (Array.isArray(meds)) meds.forEach(m => { if (m.nombre) todosNombres.add(m.nombre); });
            } catch (e) {}
        }
    });
    let unidadesMap = {};
    if (todosNombres.size > 0) {
        const { data: prods } = await supabaseClient
            .from("productos")
            .select("pr_nombre, pr_unidad_medida")
            .in("pr_nombre", Array.from(todosNombres));
        if (prods) prods.forEach(p => { if (p.pr_unidad_medida) unidadesMap[p.pr_nombre] = p.pr_unidad_medida; });
    }

    return consultas.map(c => {
        const examen = examenes.find(e => e.ef_cm_id_consulta === c.cm_id_consulta) || null;
        const ecto = ectoparasitos.find(e => e.e_cm_id_consulta === c.cm_id_consulta) || null;
        const plan = planes.find(p => p.pd_cm_id_consulta === c.cm_id_consulta) || null;

        // Enriquecer medicamentos con unidad de medida
        let medicamentosEnriquecidos = c.cm_medicamentos_aplicados || '';
        if (medicamentosEnriquecidos && medicamentosEnriquecidos !== '[]') {
            try {
                const meds = JSON.parse(medicamentosEnriquecidos);
                if (Array.isArray(meds)) {
                    const medsConUnidad = meds.map(m => ({
                        ...m,
                        unidad: m.unidad || unidadesMap[m.nombre] || ''
                    }));
                    medicamentosEnriquecidos = JSON.stringify(medsConUnidad);
                }
            } catch (e) {}
        }

        return {
            fecha: c.cm_fecha_consulta ? c.cm_fecha_consulta.split(" ")[0] : '',
            motivo: c.cm_motivo_consulta || '',
            diagnosticoDiferencial: c.cm_diagnosticos_diferenciales || '',
            diagnosticoDefinitivo: c.cm_diagnostico_definitivo || '',
            observaciones: c.cm_observaciones || '',
            formula: c.cm_formula || '',
            medicamentosAplicados: medicamentosEnriquecidos,
            examenFisico: examen ? {
                peso: examen.ef_peso_mascota || '',
                frecuenciaRespiratoria: examen.ef_fr || '',
                frecuenciaCardiaca: examen.ef_fc || '',
                pulso: examen.ef_pulso || '',
                tllc: examen.ef_tllc || '',
                deshidratacion: examen.ef_deshidratacion || '',
                trufa: examen.ef_trufa || '',
                turgenciaPiel: examen.ef_turgencia_piel || '',
                temperatura: examen.ef_temperatura || '',
                reflejoPupilar: examen.ef_reflejo_pupilar || '',
                palpAbdominal: examen.ef_palp_abdominal || '',
                estadoConciencia: examen.ef_estado_conciencia || '',
                aparienciaGeneral: examen.ef_apariencia_general || '',
                mucosas: examen.ef_color_mucosas || '',
                bocaDientes: examen.ef_boca_dientes || '',
                ojos: examen.ef_ojos || '',
                oidos: examen.ef_oidos || '',
                pielPelo: examen.ef_piel_pelo || '',
                sonidosCardiacos: examen.ef_sonidos_cardiacos || '',
                musculoEsqueletico: examen.ef_musculo_esqueletico || '',
                otros: examen.ef_otros || ''
            } : null,
            ectoparasitos: ecto ? {
                pulgas: ecto.e_pulgas || '',
                garrapatas: ecto.e_garrapatas || '',
                prurito: ecto.e_pruito || '',
                descripcionPulgas: ecto.e_descripcion_pulgas || '',
                descripcionGarrapatas: ecto.e_descripcion_garrapatas || '',
                descripcionPrurito: ecto.e_descripcion_pruito || '',
                coproDirecto: ecto.e_copro_directo || '',
                coproFlotacion: ecto.e_copro_flotacion || ''
            } : null,
            planDiagnostico: plan ? {
                raspado: plan.pd_raspado || '',
                citologia: plan.pd_citologia || '',
                rxContraste: plan.pd_rx_contraste || '',
                perfilRenal: plan.pd_perfil_renal || '',
                quimicaSanguinea: plan.pd_quimica_sanguinea || '',
                perfilPreanestesico: plan.pd_perfil_preanestesico || '',
                perfilHepatico: plan.pd_perfil_hepatico || '',
                snap: plan.pd_snap || '',
                radiografia: plan.pd_radiografia || '',
                endoscopia: plan.pd_endoscopia || '',
                hospitalizacion: plan.pd_hospitalizacion || '',
                sedacion: plan.pd_sedacion || '',
                anestesia: plan.pd_anestesia || '',
                suturas: plan.pd_suturas || '',
                observacion: plan.pd_observacion || '',
                interconsulta: plan.pd_interconsulta || ''
            } : null
        };
    });
}

async function consultarVacunaciones(mascotaId, fechaInicio, fechaFin) {
    const { data, error } = await supabaseClient
        .from("info_vacunacion")
        .select("iv_fecha_vacunacion, iv_pr_id_producto, iv_v_id_vacuna, iv_cantidad, vacunas(v_nombre_vacuna), productos(pr_nombre, pr_unidad_medida)")
        .eq("iv_dm_id_mascota", mascotaId)
        .gte("iv_fecha_vacunacion", fechaInicio)
        .lte("iv_fecha_vacunacion", fechaFin);

    if (error) throw new Error("Error al consultar vacunaciones: " + error.message);
    if (!data || data.length === 0) return [];

    return data.map(v => ({
        fecha: v.iv_fecha_vacunacion || '',
        nombreVacuna: v.productos?.pr_nombre || v.vacunas?.v_nombre_vacuna || 'Vacuna sin nombre',
        cantidad: v.iv_cantidad || '',
        unidad: v.productos?.pr_unidad_medida || '',
        observaciones: ''
    }));
}

async function consultarHospitalizaciones(mascotaId, fechaInicio, fechaFin) {
    const { data: hospitalizaciones, error } = await supabaseClient
        .from("hospitalizaciones")
        .select("*")
        .eq("h_mascota_id", mascotaId)
        .gte("h_fecha_ingreso", fechaInicio)
        .lte("h_fecha_ingreso", fechaFin + " 23:59:59")
        .order("h_fecha_ingreso", { ascending: true });

    if (error) throw new Error("Error al consultar hospitalizaciones: " + error.message);
    if (!hospitalizaciones || hospitalizaciones.length === 0) return [];

    const ids = hospitalizaciones.map(h => h.h_id_hospitalizacion);

    const [medsRes, monRes, obsRes] = await Promise.all([
        supabaseClient.from("hospitalizacion_medicamentos").select("*").in("hm_hospitalizacion_id", ids),
        supabaseClient.from("hospitalizacion_monitoreo").select("*").in("hmon_hospitalizacion_id", ids),
        supabaseClient.from("hospitalizacion_observaciones").select("*").in("hobs_hospitalizacion_id", ids)
    ]);

    const medicamentos = medsRes.data || [];
    const monitoreos = monRes.data || [];
    const observaciones = obsRes.data || [];

    // Fetch administraciones for all medications
    const medIds = medicamentos.map(m => m.hm_id_medicamento);
    let administraciones = [];
    if (medIds.length > 0) {
        const { data: admData } = await supabaseClient
            .from("hospitalizacion_administraciones")
            .select("*")
            .in("hadm_medicamento_id", medIds);
        administraciones = admData || [];
    }

    return hospitalizaciones.map(h => {
        const hospMeds = medicamentos.filter(m => m.hm_hospitalizacion_id === h.h_id_hospitalizacion);
        const hospMedIds = hospMeds.map(m => m.hm_id_medicamento);

        return {
            fecha: h.h_fecha_ingreso ? h.h_fecha_ingreso.split(" ")[0] : '',
            fechaIngreso: h.h_fecha_ingreso || '',
            fechaEgreso: h.h_fecha_egreso || '',
            peso: h.h_peso || '',
            hidratacion: h.h_hidratacion || '',
            medicoTratante: h.h_medico_tratante || '',
            auxiliarTratante: h.h_auxiliar_tratante || '',
            estado: h.h_estado || '',
            observaciones: h.h_observaciones || '',
            medicamentosAdicionalesJson: h.h_medicamentos_adicionales_json || [],
            medicamentosAdicionalesTexto: h.h_medicamentos_adicionales || '',
            medicamentos: hospMeds
                .map(m => ({ nombre: m.hm_nombre || '', dosis: m.hm_dosis || '', via: m.hm_via || '', ml: m.hm_ml || '', id: m.hm_id_medicamento })),
            administraciones: administraciones
                .filter(a => hospMedIds.includes(a.hadm_medicamento_id))
                .map(a => ({
                    diaSemana: a.hadm_dia_semana || '',
                    hora: a.hadm_hora || '',
                    aplicado: a.hadm_aplicado || false,
                    medicamentoId: a.hadm_medicamento_id,
                    nota: a.hadm_nota || ''
                })),
            monitoreos: monitoreos
                .filter(m => m.hmon_hospitalizacion_id === h.h_id_hospitalizacion)
                .map(m => ({
                    diaSemana: m.hmon_dia_semana || '',
                    turno: m.hmon_turno || '',
                    colorMucosas: m.hmon_color_mucosas || '',
                    tllc: m.hmon_tllc || '',
                    sed: m.hmon_sed || '',
                    apetito: m.hmon_apetito || '',
                    animo: m.hmon_animo || '',
                    temperatura: m.hmon_temperatura != null ? m.hmon_temperatura : '',
                    fc: m.hmon_frecuencia_cardiaca != null ? m.hmon_frecuencia_cardiaca : '',
                    fr: m.hmon_frecuencia_respiratoria != null ? m.hmon_frecuencia_respiratoria : '',
                    vomitos: m.hmon_vomitos != null ? m.hmon_vomitos : '',
                    diarreas: m.hmon_diarreas != null ? m.hmon_diarreas : '',
                    comio: m.hmon_comio || false,
                    tomoAgua: m.hmon_tomo_agua || false,
                    defeco: m.hmon_defeco || false,
                    observaciones: m.hmon_observaciones || ''
                })),
            observacionesEvolucion: observaciones
                .filter(o => o.hobs_hospitalizacion_id === h.h_id_hospitalizacion)
                .map(o => ({ texto: o.hobs_texto || '', tipo: o.hobs_tipo || '', fecha: o.hobs_created_at || '' }))
        };
    });
}

async function consultarSeguimientos(mascotaId, fechaInicio, fechaFin) {
    // Primero obtener IDs de consultas de la mascota
    const { data: consultas, error: errorConsultas } = await supabaseClient
        .from("consulta_medica")
        .select("cm_id_consulta")
        .eq("cm_dm_id_mascota", mascotaId);

    if (errorConsultas) throw new Error("Error al consultar seguimientos: " + errorConsultas.message);
    if (!consultas || consultas.length === 0) return [];

    const consultaIds = consultas.map(c => c.cm_id_consulta);

    const { data, error } = await supabaseClient
        .from("seguimiento")
        .select("*")
        .in("s_cm_id_consulta", consultaIds)
        .gte("s_fecha_seguimiento", fechaInicio)
        .lte("s_fecha_seguimiento", fechaFin)
        .order("s_fecha_seguimiento", { ascending: true });

    if (error) throw new Error("Error al consultar seguimientos: " + error.message);
    if (!data || data.length === 0) return [];

    return data.map(s => ({
        fecha: s.s_fecha_seguimiento || '',
        texto: s.s_seguimiento || '',
        formula: s.s_formula || ''
    }));
}

async function generarHistorialMedico(mascotaId, fechaInicio, fechaFin) {
    try {
        // Mostrar loader
        Swal.fire({
            title: 'Generando historial...',
            text: 'Consultando datos clínicos',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        // Consultas en paralelo
        const [consultas, vacunaciones, hospitalizaciones, seguimientos, tutorRes] = await Promise.all([
            consultarConsultasMedicas(mascotaId, fechaInicio, fechaFin),
            consultarVacunaciones(mascotaId, fechaInicio, fechaFin),
            consultarHospitalizaciones(mascotaId, fechaInicio, fechaFin),
            consultarSeguimientos(mascotaId, fechaInicio, fechaFin),
            supabaseClient.from("datos_cliente").select("dc_nombre, dc_telefono, dc_identificacion").eq("dc_id_cliente", mascota.dm_dc_id_cliente).single()
        ]);

        const tutor = tutorRes.data || {};

        // Unificar eventos
        const eventos = unificarEventosClinicosLocal({ consultas, vacunaciones, hospitalizaciones, seguimientos });

        // Verificar si hay eventos
        if (eventos.length === 0) {
            Swal.fire({
                title: 'Sin registros',
                text: 'No se encontraron registros médicos en el período consultado',
                icon: 'info'
            });
            return;
        }

        // Calcular edad
        const edad = calcularEdadMascotaLocal(mascota.dm_fecha_nacimiento);

        // Preparar datos para sessionStorage
        const datosHistorial = {
            mascota: {
                nombre: mascota.dm_nombre || '',
                especie: mascota.dm_especie || '',
                raza: mascota.dm_raza || '',
                sexo: mascota.dm_sexo || '',
                peso: mascota.dm_peso || '',
                fechaNacimiento: mascota.dm_fecha_nacimiento || '',
                edad: edad
            },
            tutor: {
                nombre: tutor.dc_nombre || '—',
                telefono: tutor.dc_telefono || '—',
                identificacion: tutor.dc_identificacion || '—'
            },
            rangoFechas: {
                inicio: fechaInicio,
                fin: fechaFin
            },
            eventos: eventos
        };

        sessionStorage.setItem("datosHistorialMedico", JSON.stringify(datosHistorial));

        Swal.close();

        // Abrir popup
        const popup = window.open("reporte_historial.html", "HistorialMedico", "width=900,height=700,scrollbars=yes,resizable=yes");

        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
            Swal.fire({
                title: 'Popup bloqueado',
                text: 'Debe permitir ventanas emergentes para ver el reporte',
                icon: 'warning'
            });
        }

    } catch (err) {
        Swal.fire({
            title: 'Error',
            text: 'Error al consultar datos. Intente nuevamente: ' + err.message,
            icon: 'error'
        });
    }
}

function unificarEventosClinicosLocal(datos) {
    const eventos = [];

    if (datos.consultas && Array.isArray(datos.consultas)) {
        datos.consultas.forEach(c => { eventos.push({ tipo: 'consulta', fecha: c.fecha || '', datos: c }); });
    }
    if (datos.vacunaciones && Array.isArray(datos.vacunaciones)) {
        datos.vacunaciones.forEach(v => { eventos.push({ tipo: 'vacunacion', fecha: v.fecha || '', datos: v }); });
    }
    if (datos.hospitalizaciones && Array.isArray(datos.hospitalizaciones)) {
        datos.hospitalizaciones.forEach(h => { eventos.push({ tipo: 'hospitalizacion', fecha: h.fecha || '', datos: h }); });
    }
    if (datos.seguimientos && Array.isArray(datos.seguimientos)) {
        datos.seguimientos.forEach(s => { eventos.push({ tipo: 'seguimiento', fecha: s.fecha || '', datos: s }); });
    }

    eventos.sort((a, b) => {
        if (a.fecha < b.fecha) return -1;
        if (a.fecha > b.fecha) return 1;
        return 0;
    });

    return eventos;
}

function calcularEdadMascotaLocal(fechaNacimiento) {
    if (!fechaNacimiento || typeof fechaNacimiento !== 'string') return '—';
    const partes = fechaNacimiento.trim().split(' ')[0].split('-');
    if (partes.length < 3) return '—';
    const nacimiento = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
    const hoy = new Date();
    let anios = hoy.getFullYear() - nacimiento.getFullYear();
    let meses = hoy.getMonth() - nacimiento.getMonth();
    if (hoy.getDate() < nacimiento.getDate()) meses--;
    if (meses < 0) { anios--; meses += 12; }
    if (anios <= 0 && meses <= 0) return '< 1 mes';
    let resultado = '';
    if (anios > 0) resultado += anios + (anios === 1 ? ' año' : ' años');
    if (meses > 0) { if (resultado) resultado += ' '; resultado += meses + (meses === 1 ? ' mes' : ' meses'); }
    return resultado || '< 1 mes';
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { truncarTexto, validarArchivoAdjunto, validarTextoSeguimiento, renderBotonFinalizar, puedeFinalizarConsulta };
}
