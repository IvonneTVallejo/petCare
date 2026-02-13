var idBuscado = 0;
let clienteId = null;
let busquedaActual = 0;


// ================= CONFIG =================

const SUPABASE_URL = "https://nlqtzidfowoxylporidi.supabase.co";
const SUPABASE_KEY = "sb_publishable_Qe7khKcVgFoN1KpXydGbcA_mEddQQNi";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

$(document).ready(function () {
    // cargarGeneros();
    cargarTiposDoc();
});


const botonActualizar = document.getElementById('btnNuevoRegistro');
botonActualizar.addEventListener('click', function () {
    limpiarCampos();
});

// Funciones para limpiar los campos de los modales insertar y actualizar
function limpiarCamposTutor() {
    $("#pv_td_id_t_documento").val("");
    $("#dc_identificacion").val("");
    $("#dc_nombre").val("");
    $("#dc_telefono").val("");
    $("#dc_direccion").val("");
    $("#dc_correo").val("");
}

function limpiarCamposMascota() {
    $("#dm_dc_id_cliente").val("");
    $("#dm_nombre").val("");
    $("#dm_especie").val("");
    $("#dm_raza").val("");
    $("#dm_sexo").val("");
    $("#dm_peso").val("");
    $("#dm_fecha_nacimiento").val("");
}

// ================= CARGAR SELECTS =================

async function cargarGeneros() {

    const select = document.getElementById("pv_g_id_genero");

    const { data, error } = await supabaseClient
        .from("genero")
        .select("*")
        .order("g_id_genero");

    select.innerHTML = "<option value=''>Seleccione</option>";

    if (error) return;

    data.forEach(item => {

        const opt = document.createElement("option");
        opt.value = item.g_id_genero;
        opt.textContent = item.g_genero;

        select.appendChild(opt);
    });
}


async function cargarTiposDoc() {

    const select = document.getElementById("pv_td_id_t_documento");

    const { data, error } = await supabaseClient
        .from("tipo_documento")
        .select("*")
        .order("td_id_t_documento");

    select.innerHTML = "<option value=''>Seleccione</option>";

    if (error) return;

    data.forEach(item => {

        const opt = document.createElement("option");
        opt.value = item.td_id_t_documento;
        opt.textContent = item.td_t_documento;

        select.appendChild(opt);
    });
}


// ================= INSERTAR =================

document.getElementById("formPaciente")
    .addEventListener("submit", async function (e) {

        e.preventDefault();

        const dataPaciente = {
            dc_td_id_t_documento: document.getElementById("pv_td_id_t_documento").value,
            dc_identificacion: document.getElementById("dc_identificacion").value,
            dc_nombre: document.getElementById("dc_nombre").value,
            dc_telefono: document.getElementById("dc_telefono").value,
            dc_direccion: document.getElementById("dc_direccion").value,
            dc_correo: document.getElementById("dc_correo").value
        };

        const { data, error } = await supabaseClient
            .from("datos_cliente")
            .insert(dataPaciente)
            .select()
            .single();

        if (error) {

            await Swal.fire({
                title: "Error",
                text: error.message,
                icon: "error"
            });

        } else {


            localStorage.setItem("pacienteNuevo", JSON.stringify(data));
            clienteId = data.dc_id_cliente;

            await Swal.fire({
                title: "Paciente registrado",
                icon: "success",
                timer: 2000,
                showConfirmButton: false
            });

            showLoader();
            setTimeout(() => {
                window.location.href = "/pages/pacientes.html";
            }, 800);
        }
    });


document.getElementById("formMascota")
    .addEventListener("submit", async function (e) {

        e.preventDefault();

        const dataMascota = {
            dm_dc_id_cliente: document.getElementById("dm_dc_id_cliente").value,
            dm_nombre: document.getElementById("dm_nombre").value,
            dm_especie: document.getElementById("dm_especie").value,
            dm_raza: document.getElementById("dm_raza").value,
            dm_sexo: document.getElementById("dm_sexo").value,
            dm_peso: document.getElementById("dm_peso").value,
            dm_fecha_nacimiento: document.getElementById("dm_fecha_nacimiento").value
        };

        const { data, error } = await supabaseClient
            .from("datos_mascota")
            .insert(dataMascota)
            .select()
            .single();

        if (error) {

            await Swal.fire({
                title: "Error",
                text: error.message,
                icon: "error"
            });

        } else {

            await Swal.fire({
                title: "Mascota registrada",
                icon: "success",
                timer: 1500,
                showConfirmButton: false
            });

            $('#modalRegistroMascota').modal('hide');
            $('body').removeClass('modal-open');
            $('.modal-backdrop').remove();

            document.getElementById("formMascota").reset();
            await cargarMascotas();


        }
    });


document.addEventListener("DOMContentLoaded", async () => {

    // 🔹 Intentamos primero con pacienteNuevo (cuando acabas de registrar)
    let paciente = JSON.parse(localStorage.getItem("pacienteNuevo"));

    // 🔹 Si no existe, intentamos con pacienteSeleccionado (cuando vienes de mascotas)
    if (!paciente) {
        paciente = JSON.parse(localStorage.getItem("pacienteSeleccionado"));
    }

    // 🔹 Si no hay ninguno, deshabilitamos botón
    if (!paciente) {
        document.getElementById("btnCrearMascota").disabled = true;
        return;
    }

    clienteId = paciente.dc_id_cliente;
    document.getElementById("btnCrearMascota").disabled = false;

    const ficha = document.getElementById("fichaPaciente");
    ficha.classList.remove("d-none");

    document.getElementById("fp_documento").textContent = paciente.dc_identificacion;
    document.getElementById("fp_nombre").textContent = paciente.dc_nombre;
    document.getElementById("fp_telefono").textContent = paciente.dc_telefono;
    document.getElementById("fp_direccion").textContent = paciente.dc_direccion;
    document.getElementById("fp_email").textContent = paciente.dc_correo;

    await cargarMascotas();

    // 🔥 Solo borramos pacienteNuevo
    // (NO borramos pacienteSeleccionado porque se usa para volver)
    localStorage.removeItem("pacienteSeleccionado");
});


document.getElementById("btnCrearMascota").onclick = () => {
    document.getElementById("dm_dc_id_cliente").value = clienteId;
    $('#modalRegistroMascota').modal('show');
};


// Funcion para filtrar tabla por medio del input 
$(document).ready(function () {
    $("#filtroInput").on("keyup", function () {
        var value = $(this).val().toLowerCase();
        $("#contenidoTablaEmpleado tr").filter(function () {
            $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1)
        });
    });
});

function validarCorreo() {
    var correoInput = document.getElementById("correo");
    var correo = correoInput.value;

    var regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!regex.test(correo)) {
        correoInput.classList.add("error");
        return false;
    } else {
        correoInput.classList.remove("error");
        return true;
    }
}

async function cargarMascotas() {

    if (!clienteId) return;

    const { data, error } = await supabaseClient
        .from("datos_mascota")
        .select("dm_id_mascota, dm_nombre, dm_especie, dm_raza, dm_sexo, dm_peso, dm_fecha_nacimiento")
        .eq("dm_dc_id_cliente", clienteId);

    const tbody = document.getElementById("tablaMascotas");
    tbody.innerHTML = "";

    if (error || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">
                    No hay mascotas registradas
                </td>
            </tr>`;
        return;
    }

    data.forEach(m => {
        tbody.innerHTML += `
        <tr class="text-center">
            <td>${m.dm_nombre}</td>
            <td>${m.dm_especie || "-"}</td>
            <td>${m.dm_raza || "-"}</td>
            <td>${m.dm_sexo || "-"}</td>
            <td>${m.dm_peso ? m.dm_peso + " kg" : "-"}</td>
            <td>${m.dm_fecha_nacimiento || "-"}</td>
            <td>
                <button 
                    type="button"
                    class="btn btn-success btn-sm btn-ver-mascota"
                    data-id="${m.dm_id_mascota}">
                    👁️ Ver
                </button>
            </td>
        </tr>
    `;
    });

}

document.addEventListener("click", function (e) {

    if (e.target.classList.contains("btn-ver-mascota")) {

        const mascotaId = e.target.dataset.id;
        if (!mascotaId) return;

        // 👇 guardar ambos
        localStorage.setItem("mascotaId", mascotaId);
        const clienteActual = {
            dc_id_cliente: clienteId,
            dc_identificacion: document.getElementById("fp_documento").textContent,
            dc_nombre: document.getElementById("fp_nombre").textContent,
            dc_telefono: document.getElementById("fp_telefono").textContent,
            dc_direccion: document.getElementById("fp_direccion").textContent,
            dc_correo: document.getElementById("fp_email").textContent
        };

        localStorage.setItem("pacienteSeleccionado", JSON.stringify(clienteActual));


        showLoader();

        setTimeout(() => {
            window.location.href = "/pages/mascotas.html";
        }, 900);
    }
});


document.getElementById("inputBuscarCliente")
.addEventListener("input", async function () {

    const texto = this.value.trim();
    const tbody = document.getElementById("tablaResultadosClientes");

    // 🔥 Limpiar resultados inmediatamente
    tbody.innerHTML = `
        <tr>
            <td colspan="4" class="text-center text-muted">
                Buscando...
            </td>
        </tr>`;

    if (texto.length < 3) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted">
                    Escriba al menos 3 caracteres
                </td>
            </tr>`;
        return;
    }

    // 🔥 Generamos un id único para esta búsqueda
    const idBusqueda = ++busquedaActual;

    let query = supabaseClient
        .from("datos_cliente")
        .select("dc_id_cliente, dc_identificacion, dc_nombre, dc_telefono");

    if (!isNaN(texto)) {
        query = query.eq("dc_identificacion", Number(texto));
    } else {
        query = query.ilike("dc_nombre", `%${texto}%`);
    }

    const { data, error } = await query;

    // 🔥 Si esta respuesta NO es la más reciente, la ignoramos
    if (idBusqueda !== busquedaActual) return;

    tbody.innerHTML = "";

    if (error || !data || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted">
                    No se encontraron clientes
                </td>
            </tr>`;
        return;
    }

    data.forEach(c => {
        tbody.innerHTML += `
            <tr class="text-center">
                <td>${c.dc_identificacion}</td>
                <td>${c.dc_nombre}</td>
                <td>${c.dc_telefono}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-success"
                        onclick="seleccionarCliente(${c.dc_id_cliente})">
                        👁️ Ver
                    </button>
                </td>
            </tr>`;
    });
});


document.getElementById("btnBuscarPaciente").addEventListener("click", () => {

    document.getElementById("inputBuscarCliente").value = "";

    document.getElementById("tablaResultadosClientes").innerHTML = `
        <tr>
            <td colspan="4" class="text-center text-muted">
                Escriba al menos 3 caracteres
            </td>
        </tr>`;

    $('#modalBuscarPaciente').modal('show');
});



document.getElementById("btnBuscarPaciente").addEventListener("click", () => {
    $('#modalBuscarPaciente').modal('show');
});


async function seleccionarCliente(id) {

    const { data: cliente, error } = await supabaseClient
        .from("datos_cliente")
        .select("*")
        .eq("dc_id_cliente", id)
        .single();

    if (error || !cliente) return;
    clienteId = cliente.dc_id_cliente;
    document.getElementById("fp_documento").textContent = cliente.dc_identificacion;
    document.getElementById("fp_nombre").textContent = cliente.dc_nombre;
    document.getElementById("fp_telefono").textContent = cliente.dc_telefono;
    document.getElementById("fp_direccion").textContent = cliente.dc_direccion;
    document.getElementById("fp_email").textContent = cliente.dc_correo;

    document.getElementById("btnCrearMascota").disabled = false;

    await cargarMascotas();

    $('#modalBuscarPaciente').modal('hide');
}
