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
                cm_medicamentos_aplicados: document.getElementById("cm_medicamentos_aplicados").value,
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
                    class="btn btn-success btn-sm btn-ver-consulta"
                    data-id="${c.cm_id_consulta}">
                    👁️ Ver
                </button>
                <button 
                    type="button"
                    class="btn btn-success btn-sm btn-formular"
                    data-id="${c.cm_id_consulta}">
                    📄 Formular
                </button>
            </td>
        </tr>
    `;
    });


}


document.addEventListener("click", async function (e) {

    if (!e.target.classList.contains("btn-ver-consulta")) return;

    consultaActualId = e.target.dataset.id;
    debugger;
    // Consultar la consulta seleccionada
    const { data: consulta, error } = await supabaseClient
        .from("consulta_medica")
        .select(`
    cm_fecha_consulta,
    cm_motivo_consulta,
    cm_ec_id_estado,
    estado_consulta!consulta_medica_cm_ec_id_estado_fkey (
            ec_estado_consulta
        )
`)

        .eq("cm_id_consulta", consultaActualId)
        .single();

    if (error || !consulta) {
        Swal.fire("Error", "No se pudo cargar la consulta", "error");
        return;
    }

    // Llenar el modal
    const fecha = consulta.cm_fecha_consulta.split(" ")[0]; // yyyy-mm-dd
    const [year, month, day] = fecha.split("-");

    document.getElementById("vc_fecha").textContent =
        `${day}/${month}/${year}`;

    document.getElementById("vc_motivo").textContent =
        consulta.cm_motivo_consulta || "-";

    document.getElementById("vc_estado").textContent =
        consulta.estado_consulta?.ec_estado_consulta || "-";

    const estadoId = Number(consulta.cm_ec_id_estado);

    const btnFinalizar = document.getElementById("btnFinalizarConsulta");

    if (estadoId === 2) {
        // Finalizada

        btnFinalizar.disabled = true;
        btnFinalizar.classList.add("disabled");

    } else {
        // Abierta
        btnFinalizar.disabled = false;
        btnFinalizar.classList.remove("disabled");
    }
    // Abrir modal
    $('#modalVerConsulta').modal('show');
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
    window.open("/pages/reporte_formula.html", "_blank");
};


document.getElementById("btnRegresar").onclick = () => {

    const clienteId = localStorage.getItem("clienteSeleccionado");

    if (!clienteId) {
        window.location.href = "/pages/pacientes.html";
        return;
    }

    localStorage.setItem("tutorVolver", clienteId);

    window.location.href = "/pages/pacientes.html";
};

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

    let container = document.getElementById("examenFisicoContainer");

    let html = "";

    examenFisicoCampos.forEach(campo => {

        html += `
<div class="campo">
<label>${campo[0]}</label>
<input type="text" id="${campo[1]}">
</div>
`;

    });

    container.innerHTML = html;

}

generarExamenFisico();

document.querySelectorAll('input[type="checkbox"][data-group]').forEach(check => {

    check.addEventListener('change', function () {

        let group = this.dataset.group;

        document.querySelectorAll(`input[data-group="${group}"]`).forEach(c => {

            if (c !== this) {
                c.checked = false;
            }

        });

    });

});