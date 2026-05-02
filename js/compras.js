// ================= CONFIG =================

const SUPABASE_URL = "https://nlqtzidfowoxylporidi.supabase.co";
const SUPABASE_KEY = "sb_publishable_Qe7khKcVgFoN1KpXydGbcA_mEddQQNi";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// ================= GLOBAL STATE =================

let ordenesCache = [];
let facturasCache = [];
let proveedoresCache = [];
let productosCache = [];
let lineasOrdenCount = 0;

// ================= INITIALIZATION =================

document.addEventListener("DOMContentLoaded", async () => {
    await cargarOrdenes();
    await cargarFacturas();
    await cargarProveedoresSelect();
    await cargarProductosSelect();
});

// ================= LOAD ORDERS =================

async function cargarOrdenes() {
    const { data, error } = await supabaseClient
        .from("ordenes_compra")
        .select(`
            *,
            proveedores ( prov_id_proveedor, prov_nombre ),
            estado_orden_compra ( eoc_id_estado, eoc_estado )
        `)
        .order("oc_fecha_creacion", { ascending: false });

    if (error) {
        await Swal.fire({ title: "Error", text: error.message, icon: "error" });
        return;
    }

    ordenesCache = data || [];
    renderizarTablaOrdenes(ordenesCache);
}

function renderizarTablaOrdenes(ordenes) {
    const tbody = document.getElementById("tablaOrdenes");
    tbody.innerHTML = "";

    if (!ordenes || ordenes.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">
                    No hay órdenes de compra registradas
                </td>
            </tr>`;
        return;
    }

    ordenes.forEach(o => {
        const estado = o.estado_orden_compra ? o.estado_orden_compra.eoc_estado : "-";
        const estadoId = o.estado_orden_compra ? o.estado_orden_compra.eoc_id_estado : 0;
        let badgeClass = "badge-success";
        if (estado === "pendiente") badgeClass = "badge-warning";
        if (estado === "recibida_parcial") badgeClass = "badge-warning";
        if (estado === "recibida_completa") badgeClass = "badge-success";
        if (estado === "cancelada") badgeClass = "badge-danger";

        const provNombre = o.proveedores ? o.proveedores.prov_nombre : "-";

        // Action buttons: Recibir (only if pendiente or recibida_parcial), Cancelar (only if pendiente)
        let acciones = "";
        if (estadoId === 1 || estadoId === 2) {
            acciones += `<button class="btn btn-info btn-accion btn-recibir-orden" data-id="${o.oc_id_orden}" data-numero="${o.oc_numero_orden}" data-proveedor="${provNombre}" title="Recibir">📦</button>`;
        }
        if (estadoId === 1) {
            acciones += `<button class="btn btn-danger btn-accion btn-cancelar-orden" data-id="${o.oc_id_orden}" title="Cancelar">❌</button>`;
        }
        if (!acciones) {
            acciones = '<span class="text-muted">-</span>';
        }

        tbody.innerHTML += `
        <tr class="text-center">
            <td>${o.oc_numero_orden}</td>
            <td>${provNombre}</td>
            <td>${new Date(o.oc_fecha_creacion).toLocaleDateString("es-CO")}</td>
            <td>$${Number(o.oc_total).toLocaleString("es-CO")}</td>
            <td><span class="badge badge-estado ${badgeClass}">${estado.replace(/_/g, " ")}</span></td>
            <td>${acciones}</td>
        </tr>`;
    });
}


// ================= LOAD PROVIDERS SELECT =================

async function cargarProveedoresSelect() {
    const { data, error } = await supabaseClient
        .from("proveedores")
        .select("prov_id_proveedor, prov_nombre")
        .order("prov_nombre");

    if (error) return;

    proveedoresCache = data || [];

    const select = document.getElementById("ordenProveedor");
    select.innerHTML = '<option value="">Seleccione un proveedor</option>';
    proveedoresCache.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.prov_id_proveedor;
        opt.textContent = p.prov_nombre;
        select.appendChild(opt);
    });
}

// ================= LOAD PRODUCTS SELECT =================

async function cargarProductosSelect() {
    const { data, error } = await supabaseClient
        .from("productos")
        .select("pr_id_producto, pr_nombre, pr_costo_compra, pr_lote")
        .order("pr_nombre");

    if (error) return;

    productosCache = data || [];
}

function poblarSelectProducto(selectElement) {
    selectElement.innerHTML = '<option value="">Seleccione un producto</option>';
    productosCache.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.pr_id_producto;
        opt.textContent = `${p.pr_nombre} (Lote: ${p.pr_lote})`;
        opt.dataset.costo = p.pr_costo_compra;
        selectElement.appendChild(opt);
    });
}

// ================= DYNAMIC LINE MANAGEMENT =================

function agregarLineaOrden() {
    const tbody = document.getElementById("tablaLineasOrden");
    const idx = lineasOrdenCount++;

    const tr = document.createElement("tr");
    tr.classList.add("text-center");
    tr.id = `lineaOrden_${idx}`;
    tr.innerHTML = `
        <td>
            <select class="form-control form-control-sm linea-producto" data-idx="${idx}" required>
                <option value="">Seleccione</option>
            </select>
        </td>
        <td>
            <input type="number" class="form-control form-control-sm linea-cantidad" data-idx="${idx}" min="1" value="1" required>
        </td>
        <td>
            <input type="number" class="form-control form-control-sm linea-costo" data-idx="${idx}" step="0.01" min="0" value="0" required>
        </td>
        <td class="linea-subtotal" data-idx="${idx}">$0</td>
        <td>
            <button type="button" class="btn btn-danger btn-accion btn-eliminar-linea" data-idx="${idx}">🗑️</button>
        </td>
    `;

    tbody.appendChild(tr);

    // Populate product select for this line
    const selectProducto = tr.querySelector(`.linea-producto[data-idx="${idx}"]`);
    poblarSelectProducto(selectProducto);

    // Auto-fill cost when product is selected
    selectProducto.addEventListener("change", function () {
        const selectedOption = this.options[this.selectedIndex];
        const costoInput = tr.querySelector(`.linea-costo[data-idx="${idx}"]`);
        if (selectedOption.value) {
            costoInput.value = parseFloat(selectedOption.dataset.costo || 0).toFixed(2);
        } else {
            costoInput.value = "0";
        }
        recalcularTotales();
    });

    // Recalculate on quantity or cost change
    tr.querySelector(`.linea-cantidad[data-idx="${idx}"]`).addEventListener("input", recalcularTotales);
    tr.querySelector(`.linea-costo[data-idx="${idx}"]`).addEventListener("input", recalcularTotales);
}

function eliminarLineaOrden(idx) {
    const tr = document.getElementById(`lineaOrden_${idx}`);
    if (tr) {
        tr.remove();
        recalcularTotales();
    }
}

function recalcularTotales() {
    const tbody = document.getElementById("tablaLineasOrden");
    const filas = tbody.querySelectorAll("tr");
    let totalGeneral = 0;

    filas.forEach(fila => {
        const idx = fila.id.replace("lineaOrden_", "");
        const cantidad = parseInt(fila.querySelector(`.linea-cantidad[data-idx="${idx}"]`)?.value) || 0;
        const costo = parseFloat(fila.querySelector(`.linea-costo[data-idx="${idx}"]`)?.value) || 0;
        const subtotal = cantidad * costo;

        const subtotalCell = fila.querySelector(`.linea-subtotal[data-idx="${idx}"]`);
        if (subtotalCell) {
            subtotalCell.textContent = `$${subtotal.toLocaleString("es-CO")}`;
        }

        totalGeneral += subtotal;
    });

    document.getElementById("totalGeneralOrden").textContent = totalGeneral.toLocaleString("es-CO");
}

// ================= CREATE ORDER =================

async function crearOrden(proveedorId, lineas) {
    // Get next order number
    const { data: maxData, error: maxError } = await supabaseClient
        .from("ordenes_compra")
        .select("oc_numero_orden")
        .order("oc_numero_orden", { ascending: false })
        .limit(1);

    if (maxError) {
        await Swal.fire({ title: "Error", text: maxError.message, icon: "error" });
        return;
    }

    const nextNumero = (maxData && maxData.length > 0) ? maxData[0].oc_numero_orden + 1 : 1;

    // Calculate total from line subtotals
    let total = 0;
    lineas.forEach(l => {
        l.subtotal = l.cantidad * l.costoUnitario;
        total += l.subtotal;
    });

    // INSERT order
    const { data: orden, error: errOrden } = await supabaseClient
        .from("ordenes_compra")
        .insert({
            oc_prov_id_proveedor: proveedorId,
            oc_numero_orden: nextNumero,
            oc_total: total,
            oc_eoc_id_estado: 1 // pendiente
        })
        .select()
        .single();

    if (errOrden) {
        await Swal.fire({ title: "Error", text: errOrden.message, icon: "error" });
        return;
    }

    // INSERT all detail lines
    const detalles = lineas.map(l => ({
        doc_oc_id_orden: orden.oc_id_orden,
        doc_pr_id_producto: l.productoId,
        doc_cantidad: l.cantidad,
        doc_costo_unitario: l.costoUnitario,
        doc_subtotal: l.subtotal,
        doc_cantidad_recibida: 0
    }));

    const { error: errDetalles } = await supabaseClient
        .from("detalle_orden_compra")
        .insert(detalles);

    if (errDetalles) {
        await Swal.fire({ title: "Error", text: errDetalles.message, icon: "error" });
        return;
    }

    await Swal.fire({
        title: "Orden creada",
        text: `Orden Nº ${nextNumero} registrada exitosamente.`,
        icon: "success",
        timer: 2500,
        showConfirmButton: false
    });

    $('#modalNuevaOrden').modal('hide');
    document.getElementById("formNuevaOrden").reset();
    document.getElementById("tablaLineasOrden").innerHTML = "";
    document.getElementById("totalGeneralOrden").textContent = "0";
    lineasOrdenCount = 0;

    await cargarOrdenes();
}


// ================= RECEIVE ORDER =================

async function abrirRecepcion(ordenId) {
    // Fetch order details with product info
    const { data: detalles, error } = await supabaseClient
        .from("detalle_orden_compra")
        .select(`
            *,
            productos ( pr_id_producto, pr_nombre, pr_lote, pr_cantidad_disponible )
        `)
        .eq("doc_oc_id_orden", ordenId);

    if (error) {
        await Swal.fire({ title: "Error", text: error.message, icon: "error" });
        return;
    }

    if (!detalles || detalles.length === 0) {
        await Swal.fire({ title: "Sin detalles", text: "No se encontraron líneas para esta orden.", icon: "warning" });
        return;
    }

    // Find order info from cache
    const orden = ordenesCache.find(o => o.oc_id_orden === ordenId);
    const provNombre = orden && orden.proveedores ? orden.proveedores.prov_nombre : "-";
    const numOrden = orden ? orden.oc_numero_orden : ordenId;

    document.getElementById("recepcionOrdenId").value = ordenId;
    document.getElementById("recepcionOrdenNumero").textContent = `OC-${numOrden}`;
    document.getElementById("recepcionProveedorNombre").textContent = provNombre;
    document.getElementById("recepcionNumeroFactura").value = "";

    // Render reception lines
    const tbody = document.getElementById("tablaLineasRecepcion");
    tbody.innerHTML = "";

    detalles.forEach(d => {
        const productoNombre = d.productos ? `${d.productos.pr_nombre} (Lote: ${d.productos.pr_lote})` : `Producto #${d.doc_pr_id_producto}`;
        const pendiente = d.doc_cantidad - d.doc_cantidad_recibida;

        tbody.innerHTML += `
        <tr class="text-center">
            <td>${productoNombre}</td>
            <td>${d.doc_cantidad}</td>
            <td>
                <input type="number" class="form-control form-control-sm recepcion-cantidad"
                    data-detalle-id="${d.doc_id_detalle}"
                    data-producto-id="${d.doc_pr_id_producto}"
                    data-cantidad-solicitada="${d.doc_cantidad}"
                    data-cantidad-recibida-previa="${d.doc_cantidad_recibida}"
                    data-costo-unitario="${d.doc_costo_unitario}"
                    min="0" max="${pendiente}" value="0">
            </td>
            <td>${pendiente}</td>
        </tr>`;
    });

    $('#modalRecepcion').modal('show');
}

async function recibirOrden(ordenId, lineas) {
    // Validate at least one line has quantity > 0
    const lineasConCantidad = lineas.filter(l => l.cantidadRecibida > 0);
    if (lineasConCantidad.length === 0) {
        await Swal.fire({
            title: "Sin cantidades",
            text: "Debe ingresar al menos una cantidad recibida mayor a 0.",
            icon: "warning"
        });
        return;
    }

    // Process each line
    for (const linea of lineas) {
        if (linea.cantidadRecibida <= 0) continue;

        // UPDATE detalle_orden_compra: add received quantity
        const nuevaCantidadRecibida = linea.cantidadRecibidaPrevia + linea.cantidadRecibida;
        const { error: errDetalle } = await supabaseClient
            .from("detalle_orden_compra")
            .update({ doc_cantidad_recibida: nuevaCantidadRecibida })
            .eq("doc_id_detalle", linea.detalleId);

        if (errDetalle) {
            await Swal.fire({ title: "Error", text: errDetalle.message, icon: "error" });
            return;
        }

        // Get current product stock
        const { data: producto, error: errProd } = await supabaseClient
            .from("productos")
            .select("pr_cantidad_disponible, pr_costo_compra, pr_stock_minimo, pr_nombre")
            .eq("pr_id_producto", linea.productoId)
            .single();

        if (errProd || !producto) {
            await Swal.fire({ title: "Error", text: "Producto no encontrado.", icon: "error" });
            return;
        }

        const nuevoStock = producto.pr_cantidad_disponible + linea.cantidadRecibida;

        // INSERT movimiento_inventario type "entrada_compra" (tmi_id_tipo = 1)
        const { error: errMov } = await supabaseClient
            .from("movimientos_inventario")
            .insert({
                mi_pr_id_producto: linea.productoId,
                mi_tmi_id_tipo: 1, // entrada_compra
                mi_cantidad: linea.cantidadRecibida,
                mi_costo_unitario: linea.costoUnitario,
                mi_saldo_resultante: nuevoStock,
                mi_referencia_orden: ordenId
            });

        if (errMov) {
            await Swal.fire({ title: "Error", text: errMov.message, icon: "error" });
            return;
        }

        // UPDATE productos stock
        const { error: errUpdate } = await supabaseClient
            .from("productos")
            .update({ pr_cantidad_disponible: nuevoStock })
            .eq("pr_id_producto", linea.productoId);

        if (errUpdate) {
            await Swal.fire({ title: "Error", text: errUpdate.message, icon: "error" });
            return;
        }
    }

    // Determine new order status
    // Re-fetch all detail lines to check totals
    const { data: detallesActualizados, error: errDetalles } = await supabaseClient
        .from("detalle_orden_compra")
        .select("doc_cantidad, doc_cantidad_recibida")
        .eq("doc_oc_id_orden", ordenId);

    if (errDetalles) {
        await Swal.fire({ title: "Error", text: errDetalles.message, icon: "error" });
        return;
    }

    let todasCompletas = true;
    let algunaRecibida = false;

    detallesActualizados.forEach(d => {
        if (d.doc_cantidad_recibida > 0) algunaRecibida = true;
        if (d.doc_cantidad_recibida < d.doc_cantidad) todasCompletas = false;
    });

    // 3 = recibida_completa, 2 = recibida_parcial
    const nuevoEstado = todasCompletas ? 3 : 2;

    // UPDATE order status
    const { error: errEstado } = await supabaseClient
        .from("ordenes_compra")
        .update({ oc_eoc_id_estado: nuevoEstado })
        .eq("oc_id_orden", ordenId);

    if (errEstado) {
        await Swal.fire({ title: "Error", text: errEstado.message, icon: "error" });
        return;
    }

    // INSERT recepcion_compra record
    const numeroFactura = document.getElementById("recepcionNumeroFactura").value.trim() || null;
    const { error: errRecepcion } = await supabaseClient
        .from("recepcion_compra")
        .insert({
            rc_oc_id_orden: ordenId,
            rc_numero_factura: numeroFactura
        });

    if (errRecepcion) {
        await Swal.fire({ title: "Error", text: errRecepcion.message, icon: "error" });
        return;
    }

    await Swal.fire({
        title: "Recepción registrada",
        text: todasCompletas ? "Orden recibida completamente." : "Orden recibida parcialmente.",
        icon: "success",
        timer: 2500,
        showConfirmButton: false
    });

    $('#modalRecepcion').modal('hide');
    await cargarOrdenes();
}

// ================= CANCEL ORDER =================

async function cancelarOrden(ordenId) {
    // Verify order status is "pendiente" (eoc_id_estado = 1)
    const orden = ordenesCache.find(o => o.oc_id_orden === ordenId);
    const estadoId = orden && orden.estado_orden_compra ? orden.estado_orden_compra.eoc_id_estado : 0;

    if (estadoId !== 1) {
        await Swal.fire({
            title: "No permitido",
            text: "Solo se pueden cancelar órdenes en estado pendiente.",
            icon: "error"
        });
        return;
    }

    // SweetAlert2 confirmation
    const result = await Swal.fire({
        title: "¿Está seguro?",
        text: "Esta acción cancelará la orden de compra. No se puede deshacer.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#28a745",
        cancelButtonColor: "#d33",
        confirmButtonText: "Sí, cancelar orden",
        cancelButtonText: "No, volver"
    });

    if (!result.isConfirmed) return;

    // UPDATE order status to cancelada (4)
    const { error } = await supabaseClient
        .from("ordenes_compra")
        .update({ oc_eoc_id_estado: 4 })
        .eq("oc_id_orden", ordenId);

    if (error) {
        await Swal.fire({ title: "Error", text: error.message, icon: "error" });
        return;
    }

    await Swal.fire({
        title: "Orden cancelada",
        icon: "success",
        timer: 2000,
        showConfirmButton: false
    });

    await cargarOrdenes();
}

// ================= LOAD INVOICES =================

async function cargarFacturas() {
    const { data, error } = await supabaseClient
        .from("facturas_compra")
        .select(`
            *,
            proveedores ( prov_id_proveedor, prov_nombre )
        `)
        .order("fc_fecha_factura", { ascending: false });

    if (error) {
        await Swal.fire({ title: "Error", text: error.message, icon: "error" });
        return;
    }

    facturasCache = data || [];
    renderizarTablaFacturas(facturasCache);
}

function renderizarTablaFacturas(facturas) {
    const tbody = document.getElementById("tablaFacturas");
    tbody.innerHTML = "";

    if (!facturas || facturas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">
                    No hay facturas registradas
                </td>
            </tr>`;
        return;
    }

    facturas.forEach(f => {
        const provNombre = f.proveedores ? f.proveedores.prov_nombre : "-";
        let badgeClass = "badge-warning";
        if (f.fc_estado_pago === "pagada") badgeClass = "badge-success";
        if (f.fc_estado_pago === "cancelada") badgeClass = "badge-danger";

        tbody.innerHTML += `
        <tr class="text-center">
            <td>${f.fc_numero_factura}</td>
            <td>${provNombre}</td>
            <td>${new Date(f.fc_fecha_factura).toLocaleDateString("es-CO")}</td>
            <td>${Number(f.fc_monto_total).toLocaleString("es-CO")}</td>
            <td><span class="badge badge-estado ${badgeClass}">${f.fc_estado_pago}</span></td>
        </tr>`;
    });
}

// ================= REGISTER INVOICE =================

async function registrarFactura(data) {
    const { data: result, error } = await supabaseClient
        .from("facturas_compra")
        .insert(data)
        .select()
        .single();

    if (error) {
        if (error.code === "23505") {
            await Swal.fire({
                title: "Duplicado",
                text: "Ya existe una factura con ese número para este proveedor.",
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
        title: "Factura registrada",
        icon: "success",
        timer: 2000,
        showConfirmButton: false
    });

    $('#modalFactura').modal('hide');
    document.getElementById("formFactura").reset();
    await cargarFacturas();
}

// ================= LOAD ORDERS INTO FACTURA SELECT =================

async function cargarOrdenesEnSelectFactura() {
    const select = document.getElementById("fc_oc_id_orden");
    select.innerHTML = '<option value="">Seleccione una orden</option>';

    ordenesCache.forEach(o => {
        const opt = document.createElement("option");
        opt.value = o.oc_id_orden;
        opt.textContent = `OC-${o.oc_numero_orden} - ${o.proveedores ? o.proveedores.prov_nombre : ""}`;
        opt.dataset.proveedorId = o.oc_prov_id_proveedor;
        opt.dataset.total = o.oc_total;
        select.appendChild(opt);
    });
}

// ================= LOAD PROVIDERS INTO FACTURA SELECT =================

function cargarProveedoresEnSelectFactura() {
    const select = document.getElementById("fc_prov_id_proveedor");
    select.innerHTML = '<option value="">Seleccione un proveedor</option>';

    proveedoresCache.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.prov_id_proveedor;
        opt.textContent = p.prov_nombre;
        select.appendChild(opt);
    });
}

// ================= EVENT LISTENERS =================

// --- New Order button ---
document.getElementById("btnNuevaOrden").addEventListener("click", function () {
    document.getElementById("formNuevaOrden").reset();
    document.getElementById("tablaLineasOrden").innerHTML = "";
    document.getElementById("totalGeneralOrden").textContent = "0";
    lineasOrdenCount = 0;
    $('#modalNuevaOrden').modal('show');
});

// --- Add line button ---
document.getElementById("btnAgregarLinea").addEventListener("click", function () {
    agregarLineaOrden();
});

// --- Remove line (event delegation) ---
document.addEventListener("click", function (e) {
    if (e.target.classList.contains("btn-eliminar-linea") || e.target.closest(".btn-eliminar-linea")) {
        const btn = e.target.classList.contains("btn-eliminar-linea") ? e.target : e.target.closest(".btn-eliminar-linea");
        const idx = btn.dataset.idx;
        eliminarLineaOrden(idx);
    }
});

// --- Submit new order form ---
document.getElementById("formNuevaOrden").addEventListener("submit", async function (e) {
    e.preventDefault();

    const proveedorId = parseInt(document.getElementById("ordenProveedor").value);
    if (!proveedorId) {
        await Swal.fire({
            title: "Proveedor requerido",
            text: "Seleccione un proveedor para la orden.",
            icon: "warning"
        });
        return;
    }

    // Collect lines
    const filas = document.querySelectorAll("#tablaLineasOrden tr");
    if (filas.length === 0) {
        await Swal.fire({
            title: "Sin líneas",
            text: "Agregue al menos una línea de producto a la orden.",
            icon: "warning"
        });
        return;
    }

    const lineas = [];
    let valido = true;

    filas.forEach(fila => {
        const idx = fila.id.replace("lineaOrden_", "");
        const productoId = parseInt(fila.querySelector(`.linea-producto[data-idx="${idx}"]`)?.value);
        const cantidad = parseInt(fila.querySelector(`.linea-cantidad[data-idx="${idx}"]`)?.value) || 0;
        const costoUnitario = parseFloat(fila.querySelector(`.linea-costo[data-idx="${idx}"]`)?.value) || 0;

        if (!productoId || cantidad <= 0 || costoUnitario <= 0) {
            valido = false;
            return;
        }

        lineas.push({ productoId, cantidad, costoUnitario });
    });

    if (!valido || lineas.length === 0) {
        await Swal.fire({
            title: "Datos incompletos",
            text: "Verifique que todas las líneas tengan producto, cantidad y costo válidos.",
            icon: "warning"
        });
        return;
    }

    await crearOrden(proveedorId, lineas);
});

// --- Receive order button (event delegation) ---
document.addEventListener("click", async function (e) {
    if (e.target.classList.contains("btn-recibir-orden") || e.target.closest(".btn-recibir-orden")) {
        const btn = e.target.classList.contains("btn-recibir-orden") ? e.target : e.target.closest(".btn-recibir-orden");
        const ordenId = parseInt(btn.dataset.id);
        await abrirRecepcion(ordenId);
    }
});

// --- Cancel order button (event delegation) ---
document.addEventListener("click", async function (e) {
    if (e.target.classList.contains("btn-cancelar-orden") || e.target.closest(".btn-cancelar-orden")) {
        const btn = e.target.classList.contains("btn-cancelar-orden") ? e.target : e.target.closest(".btn-cancelar-orden");
        const ordenId = parseInt(btn.dataset.id);
        await cancelarOrden(ordenId);
    }
});

// --- Confirm reception button ---
document.getElementById("btnConfirmarRecepcion").addEventListener("click", async function () {
    const ordenId = parseInt(document.getElementById("recepcionOrdenId").value);
    const inputs = document.querySelectorAll(".recepcion-cantidad");

    const lineas = [];
    inputs.forEach(input => {
        lineas.push({
            detalleId: parseInt(input.dataset.detalleId),
            productoId: parseInt(input.dataset.productoId),
            cantidadSolicitada: parseInt(input.dataset.cantidadSolicitada),
            cantidadRecibidaPrevia: parseInt(input.dataset.cantidadRecibidaPrevia),
            cantidadRecibida: parseInt(input.value) || 0,
            costoUnitario: parseFloat(input.dataset.costoUnitario)
        });
    });

    await recibirOrden(ordenId, lineas);
});

// --- New invoice button ---
document.getElementById("btnNuevaFactura").addEventListener("click", async function () {
    document.getElementById("formFactura").reset();
    await cargarOrdenesEnSelectFactura();
    cargarProveedoresEnSelectFactura();
    $('#modalFactura').modal('show');
});

// --- Auto-fill provider and amount when order is selected in factura form ---
document.getElementById("fc_oc_id_orden").addEventListener("change", function () {
    const selectedOption = this.options[this.selectedIndex];
    if (selectedOption.value) {
        const proveedorId = selectedOption.dataset.proveedorId;
        const total = selectedOption.dataset.total;
        document.getElementById("fc_prov_id_proveedor").value = proveedorId || "";
        document.getElementById("fc_monto_total").value = total || "";
    } else {
        document.getElementById("fc_prov_id_proveedor").value = "";
        document.getElementById("fc_monto_total").value = "";
    }
});

// --- Submit invoice form ---
document.getElementById("formFactura").addEventListener("submit", async function (e) {
    e.preventDefault();

    const numeroFactura = document.getElementById("fc_numero_factura").value.trim();
    const fechaFactura = document.getElementById("fc_fecha_factura").value;
    const ordenId = parseInt(document.getElementById("fc_oc_id_orden").value);
    const proveedorId = parseInt(document.getElementById("fc_prov_id_proveedor").value);
    const montoTotal = parseFloat(document.getElementById("fc_monto_total").value);

    if (!numeroFactura || !fechaFactura || !ordenId || !proveedorId || isNaN(montoTotal)) {
        await Swal.fire({
            title: "Campos incompletos",
            text: "Por favor complete todos los campos obligatorios.",
            icon: "warning"
        });
        return;
    }

    await registrarFactura({
        fc_numero_factura: numeroFactura,
        fc_fecha_factura: fechaFactura,
        fc_oc_id_orden: ordenId,
        fc_prov_id_proveedor: proveedorId,
        fc_monto_total: montoTotal,
        fc_estado_pago: "pendiente"
    });
});
