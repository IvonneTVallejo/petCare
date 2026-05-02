// ================= CONFIG =================

const SUPABASE_URL = "https://nlqtzidfowoxylporidi.supabase.co";
const SUPABASE_KEY = "sb_publishable_Qe7khKcVgFoN1KpXydGbcA_mEddQQNi";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// ================= GLOBAL STATE =================

let proveedoresCache = [];

// ================= INITIALIZATION =================

document.addEventListener("DOMContentLoaded", async () => {
    await cargarProveedores();
});

// ================= LOAD PROVIDERS =================

async function cargarProveedores() {
    const { data, error } = await supabaseClient
        .from("proveedores")
        .select("*")
        .order("prov_nombre");

    if (error) {
        await Swal.fire({ title: "Error", text: error.message, icon: "error" });
        return;
    }

    proveedoresCache = data || [];
    renderizarTablaProveedores(proveedoresCache);
}

function renderizarTablaProveedores(proveedores) {
    const tbody = document.getElementById("tablaProveedores");
    tbody.innerHTML = "";

    if (!proveedores || proveedores.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">
                    No hay proveedores registrados
                </td>
            </tr>`;
        return;
    }

    proveedores.forEach(p => {
        tbody.innerHTML += `
        <tr class="text-center">
            <td>${p.prov_nombre}</td>
            <td>${p.prov_nit}</td>
            <td>${p.prov_telefono}</td>
            <td>${p.prov_correo}</td>
            <td>${p.prov_direccion}</td>
            <td>${p.prov_contacto || "-"}</td>
            <td>
                <button class="btn btn-success btn-accion btn-editar-proveedor" data-id="${p.prov_id_proveedor}" title="Editar">
                    ✏️
                </button>
                <button class="btn btn-info btn-accion btn-ver-historial" data-id="${p.prov_id_proveedor}" data-nombre="${p.prov_nombre}" title="Historial de Compras">
                    📋
                </button>
            </td>
        </tr>`;
    });
}

// ================= SEARCH PROVIDERS =================

function buscarProveedor(texto) {
    const termino = texto.toLowerCase().trim();

    if (!termino) {
        renderizarTablaProveedores(proveedoresCache);
        return;
    }

    const filtrados = proveedoresCache.filter(p =>
        p.prov_nombre.toLowerCase().includes(termino) ||
        p.prov_nit === termino
    );

    renderizarTablaProveedores(filtrados);
}

// Search event listener
document.getElementById("buscarProveedor")
    .addEventListener("input", function () {
        buscarProveedor(this.value);
    });

// ================= REGISTER PROVIDER =================

document.getElementById("formProveedor")
    .addEventListener("submit", async function (e) {
        e.preventDefault();

        const idProveedor = document.getElementById("prov_id_proveedor").value;

        const data = {
            prov_nombre: document.getElementById("prov_nombre").value.trim(),
            prov_nit: document.getElementById("prov_nit").value.trim(),
            prov_telefono: parseInt(document.getElementById("prov_telefono").value),
            prov_correo: document.getElementById("prov_correo").value.trim(),
            prov_direccion: document.getElementById("prov_direccion").value.trim(),
            prov_contacto: document.getElementById("prov_contacto").value.trim() || null,
            prov_condiciones_comerciales: document.getElementById("prov_condiciones_comerciales").value.trim() || null,
            prov_notas: document.getElementById("prov_notas").value.trim() || null
        };

        // Validate required fields
        if (!data.prov_nombre || !data.prov_nit || isNaN(data.prov_telefono) ||
            !data.prov_correo || !data.prov_direccion) {
            await Swal.fire({
                title: "Campos incompletos",
                text: "Por favor complete todos los campos obligatorios.",
                icon: "warning"
            });
            return;
        }

        if (idProveedor) {
            await actualizarProveedor(parseInt(idProveedor), data);
        } else {
            await registrarProveedor(data);
        }
    });

async function registrarProveedor(data) {
    const { data: result, error } = await supabaseClient
        .from("proveedores")
        .insert(data)
        .select()
        .single();

    if (error) {
        if (error.code === "23505") {
            await Swal.fire({
                title: "Duplicado",
                text: "Ya existe un proveedor con ese NIT.",
                icon: "error"
            });
        } else {
            await Swal.fire({
                title: "Error",
                text: error.message,
                icon: "error"
            });
        }
        return;
    }

    await Swal.fire({
        title: "Proveedor registrado",
        icon: "success",
        timer: 2000,
        showConfirmButton: false
    });

    $('#modalRegistroProveedor').modal('hide');
    document.getElementById("formProveedor").reset();
    document.getElementById("prov_id_proveedor").value = "";

    await cargarProveedores();
}

async function actualizarProveedor(id, data) {
    const { data: result, error } = await supabaseClient
        .from("proveedores")
        .update(data)
        .eq("prov_id_proveedor", id)
        .select()
        .single();

    if (error) {
        if (error.code === "23505") {
            await Swal.fire({
                title: "Duplicado",
                text: "Ya existe un proveedor con ese NIT.",
                icon: "error"
            });
        } else {
            await Swal.fire({
                title: "Error",
                text: error.message,
                icon: "error"
            });
        }
        return;
    }

    await Swal.fire({
        title: "Proveedor actualizado",
        icon: "success",
        timer: 2000,
        showConfirmButton: false
    });

    $('#modalRegistroProveedor').modal('hide');
    document.getElementById("formProveedor").reset();
    document.getElementById("prov_id_proveedor").value = "";

    await cargarProveedores();
}

// ================= PURCHASE HISTORY =================

async function verHistorialCompras(provId) {
    const { data, error } = await supabaseClient
        .from("ordenes_compra")
        .select(`
            *,
            estado_orden_compra ( eoc_id_estado, eoc_estado )
        `)
        .eq("oc_prov_id_proveedor", provId)
        .order("oc_fecha_creacion", { ascending: false });

    if (error) {
        await Swal.fire({ title: "Error", text: error.message, icon: "error" });
        return;
    }

    renderizarTablaHistorial(data || []);
}

function renderizarTablaHistorial(ordenes) {
    const tbody = document.getElementById("tablaHistorialCompras");
    tbody.innerHTML = "";

    if (!ordenes || ordenes.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted">
                    Sin órdenes de compra registradas
                </td>
            </tr>`;
        return;
    }

    ordenes.forEach(o => {
        const estado = o.estado_orden_compra ? o.estado_orden_compra.eoc_estado : "-";
        let badgeClass = "badge-success";
        if (estado === "pendiente") badgeClass = "badge-warning";
        if (estado === "cancelada") badgeClass = "badge-danger";
        if (estado === "recibida_parcial") badgeClass = "badge-warning";
        if (estado === "recibida_completa") badgeClass = "badge-success";

        tbody.innerHTML += `
        <tr class="text-center">
            <td>${o.oc_numero_orden}</td>
            <td>${new Date(o.oc_fecha_creacion).toLocaleDateString("es-CO")}</td>
            <td>$${Number(o.oc_total).toLocaleString("es-CO")}</td>
            <td><span class="badge badge-estado ${badgeClass}">${estado.replace(/_/g, " ")}</span></td>
        </tr>`;
    });
}

// ================= EDIT PROVIDER =================

document.addEventListener("click", async function (e) {
    // Edit provider button
    if (e.target.classList.contains("btn-editar-proveedor") || e.target.closest(".btn-editar-proveedor")) {
        const btn = e.target.classList.contains("btn-editar-proveedor") ? e.target : e.target.closest(".btn-editar-proveedor");
        const id = parseInt(btn.dataset.id);
        await abrirEditarProveedor(id);
    }

    // History button
    if (e.target.classList.contains("btn-ver-historial") || e.target.closest(".btn-ver-historial")) {
        const btn = e.target.classList.contains("btn-ver-historial") ? e.target : e.target.closest(".btn-ver-historial");
        const id = parseInt(btn.dataset.id);
        const nombre = btn.dataset.nombre;
        abrirHistorialCompras(id, nombre);
    }
});

async function abrirEditarProveedor(id) {
    const proveedor = proveedoresCache.find(p => p.prov_id_proveedor === id);
    if (!proveedor) return;

    document.getElementById("prov_id_proveedor").value = proveedor.prov_id_proveedor;
    document.getElementById("prov_nombre").value = proveedor.prov_nombre;
    document.getElementById("prov_nit").value = proveedor.prov_nit;
    document.getElementById("prov_telefono").value = proveedor.prov_telefono;
    document.getElementById("prov_correo").value = proveedor.prov_correo;
    document.getElementById("prov_direccion").value = proveedor.prov_direccion;
    document.getElementById("prov_contacto").value = proveedor.prov_contacto || "";
    document.getElementById("prov_condiciones_comerciales").value = proveedor.prov_condiciones_comerciales || "";
    document.getElementById("prov_notas").value = proveedor.prov_notas || "";

    document.getElementById("modalRegistroProveedorLabel").textContent = "Editar Proveedor";
    $('#modalRegistroProveedor').modal('show');
}

// ================= OPEN PURCHASE HISTORY =================

function abrirHistorialCompras(provId, provNombre) {
    document.getElementById("historialProveedorNombre").textContent = provNombre;
    verHistorialCompras(provId);
    $('#modalHistorialCompras').modal('show');
}

// ================= NEW PROVIDER BUTTON =================

document.getElementById("btnNuevoProveedor")
    .addEventListener("click", function () {
        document.getElementById("formProveedor").reset();
        document.getElementById("prov_id_proveedor").value = "";
        document.getElementById("modalRegistroProveedorLabel").textContent = "Registro de Proveedor";
        $('#modalRegistroProveedor').modal('show');
    });
