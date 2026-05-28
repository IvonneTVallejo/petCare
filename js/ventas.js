// ================= CONFIG =================

const SUPABASE_URL = "https://nlqtzidfowoxylporidi.supabase.co";
const SUPABASE_KEY = "sb_publishable_Qe7khKcVgFoN1KpXydGbcA_mEddQQNi";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// ================= GLOBAL STATE =================

let carrito = [];
let clienteSeleccionado = null; // { dc_id_cliente, dc_nombre, dc_identificacion }
let esConsumidorFinal = true;
let debounceTimer = null;
let debounceClienteTimer = null;
let preordenCargada = null; // { po_id_preorden, po_cm_id_consulta, ... }
let debouncePreordenTimer = null;

// ================= INITIALIZATION =================

document.addEventListener("DOMContentLoaded", () => {
    inicializarEventos();
});

function inicializarEventos() {
    // Product search
    const inputBuscar = document.getElementById("buscarProductoPOS");
    inputBuscar.addEventListener("input", function () {
        clearTimeout(debounceTimer);
        const texto = this.value.trim();
        if (texto.length < 1) {
            // Mostrar todos los productos cuando el campo está vacío
            buscarProductoPOS("");
            return;
        }
        debounceTimer = setTimeout(() => {
            buscarProductoPOS(texto);
        }, 300);
    });

    // Mostrar lista de productos al hacer focus
    inputBuscar.addEventListener("focus", function () {
        buscarProductoPOS(this.value.trim());
    });

    // Close search results when clicking outside
    document.addEventListener("click", function (e) {
        const searchContainer = document.querySelector(".search-container:not(.preorden-search-container)");
        if (searchContainer && !searchContainer.contains(e.target)) {
            cerrarResultadosBusqueda();
        }
        const clientContainer = document.querySelector(".client-search-container");
        if (clientContainer && !clientContainer.contains(e.target)) {
            cerrarResultadosCliente();
        }
    });

    // Client search
    const inputCliente = document.getElementById("buscarClienteInput");
    inputCliente.addEventListener("input", function () {
        clearTimeout(debounceClienteTimer);
        const texto = this.value.trim();
        if (texto.length < 2) {
            cerrarResultadosCliente();
            return;
        }
        debounceClienteTimer = setTimeout(() => {
            buscarCliente(texto);
        }, 300);
    });

    // Consumidor Final checkbox
    document.getElementById("chkConsumidorFinal").addEventListener("change", function () {
        esConsumidorFinal = this.checked;
        if (esConsumidorFinal) {
            clienteSeleccionado = null;
            document.getElementById("buscarClienteInput").value = "";
            document.getElementById("buscarClienteInput").disabled = true;
            document.getElementById("clienteSeleccionado").innerHTML =
                '<span class="client-selected">Consumidor Final</span>';
            cerrarResultadosCliente();
        } else {
            document.getElementById("buscarClienteInput").disabled = false;
            document.getElementById("clienteSeleccionado").innerHTML = "";
        }
    });

    // Initialize as Consumidor Final
    document.getElementById("buscarClienteInput").disabled = true;
    document.getElementById("clienteSeleccionado").innerHTML =
        '<span class="client-selected">Consumidor Final</span>';

    // Confirm sale
    document.getElementById("btnConfirmarVenta").addEventListener("click", confirmarVenta);

    // Clear cart
    document.getElementById("btnLimpiarCarrito").addEventListener("click", limpiarCarrito);

    // Print receipt
    document.getElementById("btnImprimirRecibo").addEventListener("click", function () {
        window.print();
    });

    // Historial search
    document.getElementById("btnBuscarHistorial").addEventListener("click", function () {
        const numero = document.getElementById("historialBuscarNumero").value.trim();
        const fecha = document.getElementById("historialFecha").value;
        const cliente = document.getElementById("historialBuscarCliente").value.trim();
        buscarVentasHistorial({ numero, fecha, cliente });
    });

    // Load historial when modal opens
    $('#modalHistorialVentas').on('shown.bs.modal', function () {
        buscarVentasHistorial({});
    });

    // Pre-orden search
    const inputPreorden = document.getElementById("buscarPreordenInput");
    if (inputPreorden) {
        inputPreorden.addEventListener("input", function () {
            clearTimeout(debouncePreordenTimer);
            const texto = this.value.trim();
            debouncePreordenTimer = setTimeout(() => {
                buscarPreordenesPendientes(texto);
            }, 300);
        });

        // Mostrar todas las pendientes al hacer focus
        inputPreorden.addEventListener("focus", function () {
            buscarPreordenesPendientes(this.value.trim());
        });
    }

    // Cancel preorder button
    const btnCancelarPreorden = document.getElementById("btnCancelarPreorden");
    if (btnCancelarPreorden) {
        btnCancelarPreorden.addEventListener("click", quitarPreordenDelCarrito);
    }
}

// ================= PRODUCT SEARCH =================

async function buscarProductoPOS(texto) {
    const hoy = new Date().toISOString().split("T")[0];

    let query = supabaseClient
        .from("productos")
        .select("pr_id_producto, pr_nombre, pr_precio_venta, pr_cantidad_disponible, pr_costo_compra, pr_fecha_vencimiento, pr_lote, pr_stock_minimo")
        .gt("pr_cantidad_disponible", 0)
        .order("pr_nombre");

    if (texto && texto.length > 0) {
        query = query.ilike("pr_nombre", `%${texto}%`);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error buscando productos:", error.message);
        return;
    }

    // Filter out expired products (pr_fecha_vencimiento < today)
    const productosValidos = (data || []).filter(p => {
        if (!p.pr_fecha_vencimiento) return true;
        return p.pr_fecha_vencimiento >= hoy;
    });

    renderizarResultadosBusqueda(productosValidos);
}

function renderizarResultadosBusqueda(productos) {
    const container = document.getElementById("resultadosBusqueda");

    if (!productos || productos.length === 0) {
        container.innerHTML = '<div class="search-result-item"><span class="text-muted">No se encontraron productos</span></div>';
        container.classList.add("active");
        return;
    }

    container.innerHTML = "";

    productos.forEach(p => {
        const item = document.createElement("div");
        item.classList.add("search-result-item");
        item.innerHTML = `
            <div class="product-info">
                <div class="product-name">${p.pr_nombre}</div>
                <div class="product-details">
                    Precio: ${Number(p.pr_precio_venta).toLocaleString("es-CO")} | 
                    Stock: ${p.pr_cantidad_disponible} | 
                    Lote: ${p.pr_lote}
                </div>
            </div>
            <button class="btn-agregar" ${p.pr_cantidad_disponible <= 0 ? 'disabled' : ''}>Agregar</button>
        `;

        const btnAgregar = item.querySelector(".btn-agregar");
        btnAgregar.addEventListener("click", function (e) {
            e.stopPropagation();
            agregarAlCarrito(p);
            cerrarResultadosBusqueda();
            document.getElementById("buscarProductoPOS").value = "";
        });

        container.appendChild(item);
    });

    container.classList.add("active");
}

function cerrarResultadosBusqueda() {
    const container = document.getElementById("resultadosBusqueda");
    container.classList.remove("active");
    container.innerHTML = "";
}

// ================= CART MANAGEMENT =================

function agregarAlCarrito(producto) {
    // Check if product already in cart
    const existente = carrito.findIndex(item => item.pr_id_producto === producto.pr_id_producto);

    if (existente !== -1) {
        // Increment quantity, validate stock
        const nuevaCantidad = carrito[existente].cantidad + 1;
        if (nuevaCantidad > producto.pr_cantidad_disponible) {
            Swal.fire({
                title: "Stock insuficiente",
                text: `Cantidad máxima disponible: ${producto.pr_cantidad_disponible}`,
                icon: "warning"
            });
            return;
        }
        carrito[existente].cantidad = nuevaCantidad;
        carrito[existente].subtotal = nuevaCantidad * carrito[existente].pr_precio_venta;
    } else {
        // Add new item
        carrito.push({
            pr_id_producto: producto.pr_id_producto,
            pr_nombre: producto.pr_nombre,
            pr_precio_venta: producto.pr_precio_venta,
            pr_costo_compra: producto.pr_costo_compra,
            pr_cantidad_disponible: producto.pr_cantidad_disponible,
            pr_stock_minimo: producto.pr_stock_minimo,
            cantidad: 1,
            subtotal: producto.pr_precio_venta
        });
    }

    renderizarCarrito();
}

function actualizarCantidad(idx, cant) {
    const cantidad = parseInt(cant);

    if (isNaN(cantidad) || cantidad < 1) {
        renderizarCarrito();
        return;
    }

    if (carrito[idx].esServicio) return;

    if (cantidad > carrito[idx].pr_cantidad_disponible) {
        Swal.fire({
            title: "Stock insuficiente",
            text: `Cantidad máxima disponible para "${carrito[idx].pr_nombre}": ${carrito[idx].pr_cantidad_disponible}`,
            icon: "warning"
        });
        // Reset to max available
        carrito[idx].cantidad = carrito[idx].pr_cantidad_disponible;
        carrito[idx].subtotal = carrito[idx].cantidad * carrito[idx].pr_precio_venta;
        renderizarCarrito();
        return;
    }

    carrito[idx].cantidad = cantidad;
    carrito[idx].subtotal = cantidad * carrito[idx].pr_precio_venta;
    renderizarCarrito();
}

function eliminarDelCarrito(idx) {
    carrito.splice(idx, 1);
    renderizarCarrito();
}

function renderizarCarrito() {
    const tbody = document.getElementById("tablaCarrito");
    tbody.innerHTML = "";

    if (carrito.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">El carrito está vacío</td></tr>';
        actualizarTotales(0);
        return;
    }

    let totalGeneral = 0;

    carrito.forEach((item, idx) => {
        const subtotal = item.cantidad * item.pr_precio_venta;
        item.subtotal = subtotal;
        totalGeneral += subtotal;

        const tr = document.createElement("tr");

        if (item.esServicio) {
            // Service item (consultation) - no quantity edit, no delete
            const tdNombre = document.createElement("td");
            tdNombre.innerHTML = '<em>\u{1FA7A} ' + item.pr_nombre + '</em>';
            const tdCant = document.createElement("td");
            tdCant.classList.add("text-center");
            tdCant.textContent = "1";
            const tdPrecio = document.createElement("td");
            tdPrecio.textContent = Number(item.pr_precio_venta).toLocaleString("es-CO");
            const tdSubtotal = document.createElement("td");
            tdSubtotal.textContent = Number(subtotal).toLocaleString("es-CO");
            const tdAccion = document.createElement("td");
            tr.appendChild(tdNombre);
            tr.appendChild(tdCant);
            tr.appendChild(tdPrecio);
            tr.appendChild(tdSubtotal);
            tr.appendChild(tdAccion);
        } else {
            const tdNombre = document.createElement("td");
            tdNombre.textContent = item.pr_nombre;

            const tdCant = document.createElement("td");
            const qtyInput = document.createElement("input");
            qtyInput.type = "number";
            qtyInput.classList.add("cart-qty-input");
            qtyInput.value = item.cantidad;
            qtyInput.min = 1;
            qtyInput.max = item.pr_cantidad_disponible;
            qtyInput.dataset.idx = idx;
            qtyInput.addEventListener("change", function () {
                actualizarCantidad(parseInt(this.dataset.idx), this.value);
            });
            tdCant.appendChild(qtyInput);

            const tdPrecio = document.createElement("td");
            tdPrecio.textContent = Number(item.pr_precio_venta).toLocaleString("es-CO");

            const tdSubtotal = document.createElement("td");
            tdSubtotal.textContent = Number(subtotal).toLocaleString("es-CO");

            const tdAccion = document.createElement("td");
            const btnEliminar = document.createElement("button");
            btnEliminar.classList.add("btn-eliminar");
            btnEliminar.dataset.idx = idx;
            btnEliminar.textContent = "\u{1F5D1}\uFE0F";
            btnEliminar.addEventListener("click", function () {
                eliminarDelCarrito(parseInt(this.dataset.idx));
            });
            tdAccion.appendChild(btnEliminar);

            tr.appendChild(tdNombre);
            tr.appendChild(tdCant);
            tr.appendChild(tdPrecio);
            tr.appendChild(tdSubtotal);
            tr.appendChild(tdAccion);
        }

        tbody.appendChild(tr);
    });

    actualizarTotales(totalGeneral);
}

function actualizarTotales(total) {
    document.getElementById("subtotalVenta").textContent = Number(total).toLocaleString("es-CO");
    document.getElementById("totalVenta").textContent = Number(total).toLocaleString("es-CO");
}

function limpiarCarrito() {
    if (carrito.length === 0) return;

    Swal.fire({
        title: "\u00BFLimpiar carrito?",
        text: "Se eliminar\u00E1n todos los productos del carrito.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#28a745",
        cancelButtonColor: "#d33",
        confirmButtonText: "S\u00ED, limpiar",
        cancelButtonText: "Cancelar"
    }).then((result) => {
        if (result.isConfirmed) {
            carrito = [];
            preordenCargada = null;
            ocultarIndicadorPreorden();
            renderizarCarrito();
        }
    });
}

// ================= CLIENT SEARCH =================

async function buscarCliente(texto) {
    let query = supabaseClient
        .from("datos_cliente")
        .select("dc_id_cliente, dc_nombre, dc_identificacion")
        .order("dc_nombre");

    query = query.or(`dc_nombre.ilike.%${texto}%,dc_identificacion.eq.${texto}`);

    const { data, error } = await query;

    if (error) {
        console.error("Error buscando clientes:", error.message);
        return;
    }

    renderizarResultadosCliente(data || []);
}

function renderizarResultadosCliente(clientes) {
    const container = document.getElementById("resultadosCliente");

    if (!clientes || clientes.length === 0) {
        container.innerHTML = '<div class="client-result-item text-muted">No se encontraron clientes</div>';
        container.classList.add("active");
        return;
    }

    container.innerHTML = "";

    clientes.forEach(c => {
        const item = document.createElement("div");
        item.classList.add("client-result-item");
        item.textContent = c.dc_nombre + " \u2014 " + c.dc_identificacion;

        item.addEventListener("click", function () {
            seleccionarCliente(c);
        });

        container.appendChild(item);
    });

    container.classList.add("active");
}

function seleccionarCliente(cliente) {
    clienteSeleccionado = cliente;
    esConsumidorFinal = false;
    document.getElementById("chkConsumidorFinal").checked = false;
    document.getElementById("buscarClienteInput").value = cliente.dc_nombre;
    document.getElementById("buscarClienteInput").disabled = false;
    document.getElementById("clienteSeleccionado").innerHTML =
        '<span class="client-selected">Cliente: ' + cliente.dc_nombre + ' (' + cliente.dc_identificacion + ')</span>';
    cerrarResultadosCliente();
}

function cerrarResultadosCliente() {
    const container = document.getElementById("resultadosCliente");
    container.classList.remove("active");
    container.innerHTML = "";
}

// ================= PRE-ORDEN SEARCH (Task 7) =================

/**
 * Determina el origen de una pre-orden para mostrar indicador visual.
 * @param {object} preorden - Objeto de pre-orden
 * @returns {string} "Consulta" o "Hospitalización"
 */
function obtenerOrigenPreorden(preorden) {
    if (preorden.po_h_id_hospitalizacion) return "Hospitalización";
    return "Consulta";
}

/**
 * Valida si el término de búsqueda es suficiente para ejecutar la consulta.
 * @param {string} termino
 * @returns {boolean}
 */
function validarTerminoBusquedaPreorden(termino) {
    if (!termino || typeof termino !== 'string') return false;
    return termino.trim().length >= 2;
}

/**
 * Busca pre-órdenes pendientes por término de búsqueda.
 * @param {string} termino - Texto de búsqueda (mínimo 2 caracteres)
 */
async function buscarPreordenesPendientes(termino) {
    try {
        const { data, error } = await supabaseClient
            .from("preorden_consulta")
            .select(`
                po_id_preorden,
                po_cm_id_consulta,
                po_h_id_hospitalizacion,
                po_dm_id_mascota,
                po_dc_id_cliente,
                po_valor_consulta,
                po_total,
                po_estado,
                po_fecha_creacion,
                datos_mascota ( dm_nombre ),
                datos_cliente ( dc_id_cliente, dc_nombre, dc_identificacion )
            `)
            .eq("po_estado", "pendiente")
            .order("po_fecha_creacion", { ascending: false });

        if (error) throw new Error(error.message);

        // Filtrar en frontend por término de búsqueda
        let resultados = data || [];
        if (termino && termino.trim().length > 0) {
            const terminoLower = termino.toLowerCase().trim();
            resultados = resultados.filter(po => {
                const nombreMascota = (po.datos_mascota?.dm_nombre || "").toLowerCase();
                const nombreCliente = (po.datos_cliente?.dc_nombre || "").toLowerCase();
                return nombreMascota.includes(terminoLower) || nombreCliente.includes(terminoLower);
            });
        }

        renderizarResultadosPreorden(resultados);
    } catch (err) {
        console.error("Error buscando pre-órdenes:", err);
        Swal.fire("Error", "Error al buscar pre-órdenes. Intente nuevamente.", "error");
    }
}

function renderizarResultadosPreorden(preordenes) {
    const container = document.getElementById("resultadosPreorden");

    if (!preordenes || preordenes.length === 0) {
        container.innerHTML = '<div class="search-result-item"><span class="text-muted">No se encontraron pre-\u00F3rdenes pendientes</span></div>';
        container.classList.add("active");
        return;
    }

    container.innerHTML = "";

    preordenes.forEach(po => {
        const nombreMascota = po.datos_mascota?.dm_nombre || "Sin nombre";
        const nombreCliente = po.datos_cliente?.dc_nombre || "Sin tutor";
        const fecha = po.po_fecha_creacion ? new Date(po.po_fecha_creacion).toLocaleDateString("es-CO") : "-";
        const total = Number(po.po_total).toLocaleString("es-CO");
        const origen = obtenerOrigenPreorden(po);
        const origenBadge = '<span class="badge ' + (origen === "Hospitalización" ? 'badge-info' : 'badge-primary') + '" style="font-size:0.75rem;">' + (origen === "Hospitalización" ? '\u{1F3E5}' : '\u{1FA7A}') + ' ' + origen + '</span>';
        const refText = origen === "Hospitalización" ? "Hosp. #" + po.po_h_id_hospitalizacion : "Consulta #" + po.po_cm_id_consulta;

        const item = document.createElement("div");
        item.classList.add("search-result-item");
        item.innerHTML = `
            <div class="product-info">
                <div class="product-name">\u{1F43E} ${nombreMascota} - ${nombreCliente} ${origenBadge}</div>
                <div class="product-details">
                    Fecha: ${fecha} | Total: $${total} | ${refText}
                </div>
            </div>
            <div>
                <button class="btn-agregar btn-cargar-preorden" data-id="${po.po_id_preorden}">Cargar</button>
                <button class="btn btn-sm btn-outline-danger btn-cancelar-preorden-item ml-1" data-id="${po.po_id_preorden}" title="Cancelar pre-orden">\u2716</button>
            </div>
        `;

        // Load preorder button
        const btnCargar = item.querySelector(".btn-cargar-preorden");
        btnCargar.addEventListener("click", function (e) {
            e.stopPropagation();
            cargarPreordenAlCarrito(po);
            cerrarResultadosPreorden();
            document.getElementById("buscarPreordenInput").value = "";
        });

        // Cancel preorder button
        const btnCancelar = item.querySelector(".btn-cancelar-preorden-item");
        btnCancelar.addEventListener("click", function (e) {
            e.stopPropagation();
            cancelarPreorden(po.po_id_preorden);
        });

        container.appendChild(item);
    });

    container.classList.add("active");
}

function cerrarResultadosPreorden() {
    const container = document.getElementById("resultadosPreorden");
    if (container) {
        container.classList.remove("active");
        container.innerHTML = "";
    }
}

// ================= PRE-ORDEN CART LOADING (Task 8) =================

/**
 * Transforma detalles de pre-orden a ítems del carrito de ventas.
 */
function preordenDetallesACarrito(detalles) {
    if (!Array.isArray(detalles)) return [];
    return detalles.map(d => ({
        pr_id_producto: d.pd_pr_id_producto,
        pr_nombre: d.productos?.pr_nombre || ("Producto #" + d.pd_pr_id_producto),
        pr_precio_venta: Number(d.pd_precio_unitario),
        pr_costo_compra: d.productos?.pr_costo_compra || 0,
        pr_cantidad_disponible: d.productos?.pr_cantidad_disponible || 0,
        pr_stock_minimo: d.productos?.pr_stock_minimo || 0,
        cantidad: d.pd_cantidad,
        subtotal: Number(d.pd_precio_unitario) * d.pd_cantidad,
        esServicio: false
    }));
}

/**
 * Crea el ítem de servicio "Consulta veterinaria" para el carrito.
 */
function crearItemServicioConsulta(valorConsulta) {
    return {
        pr_id_producto: 5,
        pr_nombre: "Consulta veterinaria",
        pr_precio_venta: valorConsulta,
        pr_costo_compra: 0,
        pr_cantidad_disponible: 9999,
        pr_stock_minimo: 0,
        cantidad: 1,
        subtotal: valorConsulta,
        esServicio: true
    };
}

/**
 * Carga una pre-orden completa al carrito de ventas.
 */
async function cargarPreordenAlCarrito(preorden) {
    try {
        // Fetch preorder details with product info
        const { data: detalles, error } = await supabaseClient
            .from("preorden_detalle")
            .select(`
                pd_id_detalle,
                pd_po_id_preorden,
                pd_pr_id_producto,
                pd_cantidad,
                pd_precio_unitario,
                pd_subtotal,
                productos ( pr_id_producto, pr_nombre, pr_precio_venta, pr_costo_compra, pr_cantidad_disponible, pr_stock_minimo )
            `)
            .eq("pd_po_id_preorden", preorden.po_id_preorden);

        if (error) throw new Error(error.message);

        // Clear current cart
        carrito = [];

        // Add product items from preorder
        const itemsCarrito = preordenDetallesACarrito(detalles || []);
        carrito.push(...itemsCarrito);

        // Add service item for consultation value
        if (preorden.po_valor_consulta > 0) {
            const itemServicio = crearItemServicioConsulta(Number(preorden.po_valor_consulta));
            carrito.push(itemServicio);
        }

        // Set client from preorder
        if (preorden.datos_cliente) {
            seleccionarCliente({
                dc_id_cliente: preorden.datos_cliente.dc_id_cliente,
                dc_nombre: preorden.datos_cliente.dc_nombre,
                dc_identificacion: preorden.datos_cliente.dc_identificacion || ""
            });
        }

        // Store preorder reference
        preordenCargada = preorden;

        // Show indicator
        mostrarIndicadorPreorden(preorden);

        // Render cart
        renderizarCarrito();

        Swal.fire({
            title: "Pre-orden cargada",
            text: "Los productos de la pre-orden se agregaron al carrito.",
            icon: "success",
            timer: 1500,
            showConfirmButton: false
        });

    } catch (err) {
        console.error("Error cargando pre-orden:", err);
        Swal.fire("Error", "No se pudo cargar la pre-orden. Intente nuevamente.", "error");
    }
}

function mostrarIndicadorPreorden(preorden) {
    const indicador = document.getElementById("indicadorPreorden");
    const badge = document.getElementById("badgePreorden");
    if (indicador && badge) {
        const nombreMascota = preorden.datos_mascota?.dm_nombre || "";
        var origenPO = obtenerOrigenPreorden(preorden);
        var refTextPO = origenPO === "Hospitalización" ? "Hosp. #" + preorden.po_h_id_hospitalizacion : "Consulta #" + preorden.po_cm_id_consulta;
        badge.textContent = "\u{1F4CB} Pre-orden #" + preorden.po_id_preorden + " - " + nombreMascota + " (" + refTextPO + ")";
        indicador.style.display = "flex";
    }
}

function ocultarIndicadorPreorden() {
    const indicador = document.getElementById("indicadorPreorden");
    if (indicador) {
        indicador.style.display = "none";
    }
}

function quitarPreordenDelCarrito() {
    preordenCargada = null;
    carrito = [];
    ocultarIndicadorPreorden();
    renderizarCarrito();

    // Reset client
    esConsumidorFinal = true;
    clienteSeleccionado = null;
    document.getElementById("chkConsumidorFinal").checked = true;
    document.getElementById("buscarClienteInput").value = "";
    document.getElementById("buscarClienteInput").disabled = true;
    document.getElementById("clienteSeleccionado").innerHTML =
        '<span class="client-selected">Consumidor Final</span>';
}

// ================= STOCK VALIDATION (Task 9) =================

/**
 * Valida que todos los productos del carrito tengan stock suficiente.
 * @param {Array} items - Items del carrito
 * @returns {{valido: boolean, errores: Array<string>}}
 */
function validarStockCarrito(items) {
    if (!Array.isArray(items)) return { valido: true, errores: [] };
    const errores = [];
    for (const item of items) {
        if (item.esServicio) continue; // Skip service items
        if (item.cantidad > item.pr_cantidad_disponible) {
            errores.push("Stock insuficiente para \"" + item.pr_nombre + "\": disponible " + item.pr_cantidad_disponible + ", solicitado " + item.cantidad);
        }
    }
    return { valido: errores.length === 0, errores };
}

// ================= CONFIRM SALE (Modified for pre-orden) =================

async function confirmarVenta() {
    // Validate cart is not empty
    if (carrito.length === 0) {
        await Swal.fire({
            title: "Carrito vac\u00EDo",
            text: "Agregue al menos un producto al carrito.",
            icon: "warning"
        });
        return;
    }

    // Validate stock before proceeding - fetch current stock from DB
    const productosParaValidar = carrito.filter(item => !item.esServicio);
    for (let i = 0; i < productosParaValidar.length; i++) {
        const item = productosParaValidar[i];
        const { data: prod, error: errProd } = await supabaseClient
            .from("productos")
            .select("pr_cantidad_disponible, pr_nombre")
            .eq("pr_id_producto", item.pr_id_producto)
            .single();

        if (errProd || !prod) continue;
        // Update local stock info
        const idx = carrito.findIndex(c => c.pr_id_producto === item.pr_id_producto && !c.esServicio);
        if (idx !== -1) {
            carrito[idx].pr_cantidad_disponible = prod.pr_cantidad_disponible;
        }
    }

    const validacion = validarStockCarrito(carrito);
    if (!validacion.valido) {
        await Swal.fire({
            title: "Stock insuficiente",
            html: validacion.errores.join("<br>"),
            icon: "error"
        });
        return;
    }

    // Confirmation dialog
    const totalVenta = carrito.reduce((sum, item) => sum + item.subtotal, 0);
    const nombreCliente = esConsumidorFinal ? "Consumidor Final" : (clienteSeleccionado ? clienteSeleccionado.dc_nombre : "Consumidor Final");

    const confirmResult = await Swal.fire({
        title: "Confirmar Venta",
        html: '<p><strong>Cliente:</strong> ' + nombreCliente + '</p>' +
              '<p><strong>Total:</strong> $' + Number(totalVenta).toLocaleString("es-CO") + '</p>' +
              (preordenCargada ? '<p><em>\u{1F4CB} Venta asociada a pre-orden #' + preordenCargada.po_id_preorden + '</em></p>' : '') +
              '<p>\u00BFDesea confirmar esta venta?</p>',
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#28a745",
        cancelButtonColor: "#d33",
        confirmButtonText: "S\u00ED, confirmar",
        cancelButtonText: "Cancelar"
    });

    if (!confirmResult.isConfirmed) return;

    try {
        // 1. Get next vt_numero_venta (consecutive)
        const { data: maxData, error: maxError } = await supabaseClient
            .from("ventas")
            .select("vt_numero_venta")
            .order("vt_numero_venta", { ascending: false })
            .limit(1);

        if (maxError) {
            await Swal.fire({ title: "Error", text: maxError.message, icon: "error" });
            return;
        }

        const nextNumero = (maxData && maxData.length > 0) ? maxData[0].vt_numero_venta + 1 : 1;

        // 2. INSERT venta
        const ventaData = {
            vt_numero_venta: nextNumero,
            vt_total: totalVenta,
            vt_nombre_cliente: nombreCliente
        };

        if (!esConsumidorFinal && clienteSeleccionado) {
            ventaData.vt_dc_id_cliente = clienteSeleccionado.dc_id_cliente;
        } else {
            ventaData.vt_dc_id_cliente = null;
        }

        const { data: venta, error: errVenta } = await supabaseClient
            .from("ventas")
            .insert(ventaData)
            .select()
            .single();

        if (errVenta) {
            await Swal.fire({ title: "Error", text: errVenta.message, icon: "error" });
            return;
        }

        // 3. INSERT detalle_venta lines (todos los items incluyendo servicio de consulta)
        const detallesVenta = carrito.map(item => ({
            dv_vt_id_venta: venta.vt_id_venta,
            dv_pr_id_producto: item.pr_id_producto,
            dv_cantidad: item.cantidad,
            dv_precio_unitario: item.pr_precio_venta,
            dv_costo_unitario: item.pr_costo_compra || 0,
            dv_subtotal: item.subtotal
        }));

        if (detallesVenta.length > 0) {
            const { error: errDetalles } = await supabaseClient
                .from("detalle_venta")
                .insert(detallesVenta);

            if (errDetalles) {
                await Swal.fire({ title: "Error", text: errDetalles.message, icon: "error" });
                return;
            }
        }

        // 4. For each physical product: INSERT movimientos_inventario + UPDATE stock
        let productosStockBajo = [];

        for (const item of carrito) {
            // Skip service items - no inventory discount
            if (item.esServicio) continue;

            // Get current stock
            const { data: producto, error: errProd } = await supabaseClient
                .from("productos")
                .select("pr_cantidad_disponible, pr_stock_minimo, pr_nombre, pr_costo_compra")
                .eq("pr_id_producto", item.pr_id_producto)
                .single();

            if (errProd || !producto) {
                await Swal.fire({ title: "Error", text: "Producto no encontrado.", icon: "error" });
                return;
            }

            const nuevoStock = producto.pr_cantidad_disponible - item.cantidad;

            // INSERT movimiento_inventario type "salida_venta" (tmi_id_tipo = 2)
            const { error: errMov } = await supabaseClient
                .from("movimientos_inventario")
                .insert({
                    mi_pr_id_producto: item.pr_id_producto,
                    mi_tmi_id_tipo: 2, // salida_venta
                    mi_cantidad: item.cantidad,
                    mi_costo_unitario: producto.pr_costo_compra,
                    mi_saldo_resultante: nuevoStock,
                    mi_referencia_venta: venta.vt_id_venta
                });

            if (errMov) {
                await Swal.fire({ title: "Error", text: errMov.message, icon: "error" });
                return;
            }

            // UPDATE product stock
            const { error: errUpdate } = await supabaseClient
                .from("productos")
                .update({ pr_cantidad_disponible: nuevoStock })
                .eq("pr_id_producto", item.pr_id_producto);

            if (errUpdate) {
                await Swal.fire({ title: "Error", text: errUpdate.message, icon: "error" });
                return;
            }

            // Check if stock dropped below minimum
            if (nuevoStock <= producto.pr_stock_minimo) {
                productosStockBajo.push({
                    nombre: producto.pr_nombre,
                    stock: nuevoStock,
                    minimo: producto.pr_stock_minimo
                });
            }
        }

        // 5. If preorder loaded, mark as completed
        if (preordenCargada) {
            const { error: errPreorden } = await supabaseClient
                .from("preorden_consulta")
                .update({
                    po_estado: "completada",
                    po_fecha_completada: new Date().toLocaleString("sv-SE", { timeZone: "America/Bogota" })
                })
                .eq("po_id_preorden", preordenCargada.po_id_preorden);

            if (errPreorden) {
                console.error("Error actualizando pre-orden:", errPreorden);
            }
        }

        // 6. Show success
        await Swal.fire({
            title: "Venta registrada",
            text: "Venta N\u00BA " + nextNumero + " registrada exitosamente.",
            icon: "success",
            timer: 2500,
            showConfirmButton: false
        });

        // 7. Show stock bajo warnings
        if (productosStockBajo.length > 0) {
            const listaProductos = productosStockBajo.map(p =>
                "\u2022 " + p.nombre + ": " + p.stock + " unidades (m\u00EDnimo: " + p.minimo + ")"
            ).join("<br>");

            await Swal.fire({
                title: "\u26A0\uFE0F Alerta de Stock Bajo",
                html: "Los siguientes productos est\u00E1n por debajo del stock m\u00EDnimo:<br><br>" + listaProductos,
                icon: "warning"
            });
        }

        // 8. Open receipt modal
        await generarRecibo(venta.vt_id_venta);

        // 9. Clear cart and reset state
        carrito = [];
        preordenCargada = null;
        ocultarIndicadorPreorden();
        renderizarCarrito();

        // Reset client
        esConsumidorFinal = true;
        clienteSeleccionado = null;
        document.getElementById("chkConsumidorFinal").checked = true;
        document.getElementById("buscarClienteInput").value = "";
        document.getElementById("buscarClienteInput").disabled = true;
        document.getElementById("clienteSeleccionado").innerHTML =
            '<span class="client-selected">Consumidor Final</span>';

    } catch (err) {
        await Swal.fire({ title: "Error inesperado", text: err.message, icon: "error" });
    }
}

// ================= CANCEL PRE-ORDEN (Task 9.3) =================

async function cancelarPreorden(poIdPreorden) {
    const confirmResult = await Swal.fire({
        title: "\u00BFCancelar pre-orden?",
        text: "Esta acci\u00F3n no se puede deshacer. La pre-orden quedar\u00E1 marcada como cancelada.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#6c757d",
        confirmButtonText: "S\u00ED, cancelar",
        cancelButtonText: "No"
    });

    if (!confirmResult.isConfirmed) return;

    try {
        const { error } = await supabaseClient
            .from("preorden_consulta")
            .update({
                po_estado: "cancelada",
                po_fecha_completada: new Date().toLocaleString("sv-SE", { timeZone: "America/Bogota" })
            })
            .eq("po_id_preorden", poIdPreorden);

        if (error) throw new Error(error.message);

        await Swal.fire({
            title: "Pre-orden cancelada",
            icon: "success",
            timer: 1500,
            showConfirmButton: false
        });

        cerrarResultadosPreorden();

    } catch (err) {
        console.error("Error cancelando pre-orden:", err);
        Swal.fire("Error", "No se pudo cancelar la pre-orden.", "error");
    }
}

// ================= RECEIPT GENERATION =================

async function generarRecibo(ventaId) {
    const { data: venta, error: errVenta } = await supabaseClient
        .from("ventas")
        .select("*")
        .eq("vt_id_venta", ventaId)
        .single();

    if (errVenta || !venta) {
        await Swal.fire({ title: "Error", text: "No se pudo cargar la venta.", icon: "error" });
        return;
    }

    const { data: detalles, error: errDetalles } = await supabaseClient
        .from("detalle_venta")
        .select("*, productos ( pr_nombre )")
        .eq("dv_vt_id_venta", ventaId);

    if (errDetalles) {
        await Swal.fire({ title: "Error", text: errDetalles.message, icon: "error" });
        return;
    }

    const fechaVenta = new Date(venta.vt_fecha_venta).toLocaleDateString("es-CO");
    const nombreCliente = venta.vt_nombre_cliente || "Consumidor Final";

    let filasDetalle = "";
    (detalles || []).forEach(d => {
        const nombreProducto = d.productos ? d.productos.pr_nombre : (d.dv_pr_id_producto ? "Producto #" + d.dv_pr_id_producto : "Consulta veterinaria");
        filasDetalle += '<tr><td>' + nombreProducto + '</td><td class="text-right">' + d.dv_cantidad + '</td><td class="text-right">' + Number(d.dv_precio_unitario).toLocaleString("es-CO") + '</td><td class="text-right">' + Number(d.dv_subtotal).toLocaleString("es-CO") + '</td></tr>';
    });

    const reciboHTML = '<div class="recibo-header"><h4>PetCare Bonamur</h4><p>Cl\u00EDnica Veterinaria</p><p>NIT: 000.000.000-0</p></div>' +
        '<div class="recibo-info"><span><strong>Recibo N\u00BA:</strong> ' + venta.vt_numero_venta + '</span><span><strong>Fecha:</strong> ' + fechaVenta + '</span><span><strong>Cliente:</strong> ' + nombreCliente + '</span></div>' +
        '<table class="recibo-table"><thead><tr><th>Producto</th><th class="text-right">Cant.</th><th class="text-right">Precio</th><th class="text-right">Subtotal</th></tr></thead><tbody>' + filasDetalle + '</tbody></table>' +
        '<div class="recibo-total">TOTAL: $' + Number(venta.vt_total).toLocaleString("es-CO") + '</div>' +
        '<div class="recibo-footer"><p>\u00A1Gracias por su compra!</p><p>PetCare Bonamur \u2014 Cuidamos a quienes m\u00E1s quieres</p></div>';

    document.getElementById("reciboContenido").innerHTML = reciboHTML;
    $('#modalRecibo').modal('show');
}

// ================= SALES HISTORY =================

async function buscarVentasHistorial(filtro) {
    let query = supabaseClient
        .from("ventas")
        .select("*")
        .order("vt_fecha_venta", { ascending: false })
        .order("vt_numero_venta", { ascending: false });

    if (filtro.numero) {
        const num = parseInt(filtro.numero);
        if (!isNaN(num)) {
            query = query.eq("vt_numero_venta", num);
        }
    }

    if (filtro.fecha) {
        query = query.eq("vt_fecha_venta", filtro.fecha);
    }

    if (filtro.cliente) {
        query = query.ilike("vt_nombre_cliente", "%" + filtro.cliente + "%");
    }

    query = query.limit(50);

    const { data, error } = await query;

    if (error) {
        await Swal.fire({ title: "Error", text: error.message, icon: "error" });
        return;
    }

    renderizarTablaHistorial(data || []);
}

function renderizarTablaHistorial(ventas) {
    const tbody = document.getElementById("tablaHistorialVentas");
    tbody.innerHTML = "";

    if (!ventas || ventas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No se encontraron ventas</td></tr>';
        return;
    }

    ventas.forEach(v => {
        const tr = document.createElement("tr");
        tr.classList.add("text-center");

        const tdNumero = document.createElement("td");
        tdNumero.textContent = v.vt_numero_venta;

        const tdFecha = document.createElement("td");
        tdFecha.textContent = new Date(v.vt_fecha_venta).toLocaleDateString("es-CO");

        const tdCliente = document.createElement("td");
        tdCliente.textContent = v.vt_nombre_cliente || "Consumidor Final";

        const tdTotal = document.createElement("td");
        tdTotal.textContent = Number(v.vt_total).toLocaleString("es-CO");

        const tdAcciones = document.createElement("td");
        const btnRecibo = document.createElement("button");
        btnRecibo.classList.add("btn", "btn-info", "btn-accion", "btn-ver-recibo");
        btnRecibo.dataset.id = v.vt_id_venta;
        btnRecibo.title = "Ver recibo";
        btnRecibo.textContent = "\u{1F9FE}";
        btnRecibo.addEventListener("click", async function () {
            await generarRecibo(parseInt(this.dataset.id));
        });
        tdAcciones.appendChild(btnRecibo);

        tr.appendChild(tdNumero);
        tr.appendChild(tdFecha);
        tr.appendChild(tdCliente);
        tr.appendChild(tdTotal);
        tr.appendChild(tdAcciones);

        tbody.appendChild(tr);
    });
}
