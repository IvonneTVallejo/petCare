let mascota = null;
let consultaActualId = null;


function limpiarCamposConsulta() {
    $("#dm_dc_id_cliente").val("");
    $("#dm_id_mascota").val("");
    $("#cm_motivo_consulta").val("");
    $("#cm_tratamiento").val("");
    $("#cm_notas_consulta").val("");
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
    document.getElementById("fm_fechaNacimiento").textContent = mascota.dm_fecha_nacimiento;


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

        const dataConsulta = {
            cm_dc_id_cliente: document.getElementById("dm_dc_id_cliente").value,
            cm_dm_id_mascota: document.getElementById("dm_id_mascota").value,
            cm_fecha_consulta: new Date().toISOString(),
            cm_motivo_consulta: document.getElementById("cm_motivo_consulta").value,
            cm_tratamiento: document.getElementById("cm_tratamiento").value,
            cm_notas_consulta: document.getElementById("cm_notas_consulta").value,
            cm_ec_id_estado: 1
        };

        const { error } = await supabaseClient
            .from("consulta_medica")
            .insert(dataConsulta);

        if (error) {
            Swal.fire("Error", error.message, "error");
            return;
        }

        // 🔹 Traer nombre del propietario
        const { data: cliente } = await supabaseClient
            .from("datos_cliente")
            .select("dc_nombre")
            .eq("dc_id_cliente", mascota.dm_dc_id_cliente)
            .single();

        // 🔹 Preparar datos para la fórmula
        const datosPDF = {
            propietario: cliente?.dc_nombre || "",
            mascota: mascota.dm_nombre,
            especie: mascota.dm_especie,
            raza: mascota.dm_raza,
            sexo: mascota.dm_sexo,
            peso: mascota.dm_peso + "Kg",
            tratamiento: document.getElementById("cm_tratamiento").value
        };

        sessionStorage.setItem("datosFormula", JSON.stringify(datosPDF));

        await Swal.fire({
            title: "Consulta registrada",
            icon: "success",
            timer: 1200,
            showConfirmButton: false
        });

        $('#modalRegistroConsulta').modal('hide');
        document.getElementById("formConsulta").reset();

        await cargarConsultas();

        // 🔥 Redirigir para generar descarga automática
        window.open("/pages/reporte_formula.html?auto=1", "_blank");
    });




async function cargarConsultas() {

    if (!mascota || !mascota.dm_id_mascota) return;

    const { data, error } = await supabaseClient
        .from("consulta_medica")
        .select(`
        cm_id_consulta,
        cm_fecha_consulta,
        cm_motivo_consulta,
        estado_consulta (
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
            <td>${c.cm_fecha_consulta || "-"}</td>
            <td>${motivo}</td>
            <td>${c.estado_consulta?.ec_estado_consulta || "-"}</td>
            <td>
                <button 
                    type="button"
                    class="btn btn-success btn-sm btn-ver-consulta"
                    data-id="${c.cm_id_consulta}">
                    👁️ Ver
                </button>
            </td>
        </tr>
    `;
    });


}


document.addEventListener("click", async function (e) {

    if (!e.target.classList.contains("btn-ver-consulta")) return;

    consultaActualId = e.target.dataset.id;

    // Consultar la consulta seleccionada
    const { data: consulta, error } = await supabaseClient
        .from("consulta_medica")
        .select(`
    cm_fecha_consulta,
    cm_motivo_consulta,
    cm_tratamiento,
    cm_notas_consulta,
    cm_seguimiento,
    cm_ec_id_estado,
    estado_consulta (
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
    document.getElementById("vc_fecha").textContent =
        new Date(consulta.cm_fecha_consulta).toLocaleDateString();

    document.getElementById("vc_motivo").textContent =
        consulta.cm_motivo_consulta || "-";

    document.getElementById("vc_tratamiento").textContent =
        consulta.cm_tratamiento || "-";

    document.getElementById("vc_notas").textContent =
        consulta.cm_notas_consulta || "-";

    document.getElementById("vc_estado").textContent =
        consulta.estado_consulta?.ec_estado_consulta || "-";

    document.getElementById("vc_seguimiento").textContent =
        consulta.cm_seguimiento;


    const estadoId = Number(consulta.cm_ec_id_estado);

    const seguimiento = document.getElementById("vc_seguimiento");
    const btnActualizar = document.getElementById("btnActualizarConsulta");
    const btnFinalizar = document.getElementById("btnFinalizarConsulta");

    if (estadoId === 2) {
        // Finalizada

        seguimiento.disabled = true;
        btnActualizar.disabled = true;
        btnFinalizar.disabled = true;

        btnActualizar.classList.add("disabled");
        btnFinalizar.classList.add("disabled");

    } else {
        // Abierta

        seguimiento.disabled = false;
        btnActualizar.disabled = false;
        btnFinalizar.disabled = false;

        btnActualizar.classList.remove("disabled");
        btnFinalizar.classList.remove("disabled");
    }
    // Abrir modal
    $('#modalVerConsulta').modal('show');
});


document.getElementById("btnActualizarConsulta").onclick = async () => {

    const seguimiento = document.getElementById("vc_seguimiento").value;

    const { error } = await supabaseClient
        .from("consulta_medica")
        .update({ cm_seguimiento: seguimiento })
        .eq("cm_id_consulta", consultaActualId);

    if (error) {
        Swal.fire("Error", error.message, "error");
        return;
    }

    Swal.fire({
        icon: "success",
        title: "Seguimiento actualizado",
        timer: 1200,
        showConfirmButton: false
    });
    $('#modalVerConsulta').modal('hide');
    cargarConsultas();
};


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
