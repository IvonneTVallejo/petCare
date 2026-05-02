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
        if (texto.length < 2) {
            cerrarResultadosBusqueda();
            return;
        }
        debounceTimer = setTimeout(() => {
            buscarProductoPOS(texto);
        }, 300);
    });

    // Close search results when clicking outside
    document.addEventListener("click", function (e) {
        const searchContainer = document.querySelector(".search-container");
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
}

// ================= PRODUCT SEARCH =================

async function buscarProductoPOS(texto) {
    const hoy = new Date().toISOString().split("T")[0];

    const { data, error } = await supabaseClient
        .from("productos")
        .select("pr_id_producto, pr_nombre, pr_precio_venta, pr_cantidad_disponible, pr_costo_compra, pr_fecha_vencimiento, pr_lote, pr_stock_minimo")
        .ilike("pr_nombre", `%${texto}%`)
        .gt("pr_cantidad_disponible", 0)
        .order("pr_nombre");

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
                    Precio: $${Number(p.pr_precio_venta).toLocaleString("es-CO")} | 
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
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">
                    El carrito está vacío
                </td>
            </tr>`;
        actualizarTotales(0);
        return;
    }

    let totalGeneral = 0;

    carrito.forEach((item, idx) => {
        const subtotal = item.cantidad * item.pr_precio_venta;
        item.subtotal = subtotal;
        totalGeneral += subtotal;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${item.pr_nombre}</td>
            <td>
                <input type="number" class="cart-qty-input" value="${item.cantidad}" 
                    min="1" max="${item.pr_cantidad_disponible}" data-idx="${idx}">
            </td>
            <td>$${Number(item.pr_precio_venta).toLocaleString("es-CO")}</td>
            <td>$${Number(subtotal).toLocaleString("es-CO")}</td>
            <td>
                <button class="btn-eliminar" data-idx="${idx}">🗑️</button>
            </td>
        `;

        // Quantity change event
        const qtyInput = tr.querySelector(".cart-qty-input");
        qtyInput.addEventListener("change", function () {
            actualizarCantidad(parseInt(this.dataset.idx), this.value);
        });

        // Delete button event
        const btnEliminar = tr.querySelector(".btn-eliminar");
        btnEliminar.addEventListener("click", function () {
            eliminarDelCarrito(parseInt(this.dataset.idx));
        });

        tbody.appendChild(tr);
    });

    actualizarTotales(totalGeneral);
}

function actualizarTotales(total) {
    document.getElementById("subtotalVenta").textContent = `$${Number(total).toLocaleString("es-CO")}`;
    document.getElementById("totalVenta").textContent = `$${Number(total).toLocaleString("es-CO")}`;
}

function limpiarCarrito() {
    if (carrito.length === 0) return;

    Swal.fire({
        title: "¿Limpiar carrito?",
        text: "Se eliminarán todos los productos del carrito.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#28a745",
        cancelButtonColor: "#d33",
        confirmButtonText: "Sí, limpiar",
        cancelButtonText: "Cancelar"
    }).then((result) => {
        if (result.isConfirmed) {
            carrito = [];
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

    // Search by name (ilike) or identification (eq)
    // Use or filter
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
        item.textContent = `${c.dc_nombre} — ${c.dc_identificacion}`;

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
        `<span class="client-selected">Cliente: ${cliente.dc_nombre} (${cliente.dc_identificacion})</span>`;
    cerrarResultadosCliente();
}

function cerrarResultadosCliente() {
    const container = document.getElementById("resultadosCliente");
    container.classList.remove("active");
    container.innerHTML = "";
}

// ================= CONFIRM SALE =================

async function confirmarVenta() {
    // Validate cart is not empty
    if (carrito.length === 0) {
        await Swal.fire({
            title: "Carrito vacío",
            text: "Agregue al menos un producto al carrito.",
            icon: "warning"
        });
        return;
    }

    // Confirmation dialog
    const totalVenta = carrito.reduce((sum, item) => sum + item.subtotal, 0);
    const nombreCliente = esConsumidorFinal ? "Consumidor Final" : (clienteSeleccionado ? clienteSeleccionado.dc_nombre : "Consumidor Final");

    const confirmResult = await Swal.fire({
        title: "Confirmar Venta",
        html: `
            <p><strong>Cliente:</strong> ${nombreCliente}</p>
            <p><strong>Total:</strong> $${Number(totalVenta).toLocaleString("es-CO")}</p>
            <p>¿Desea confirmar esta venta?</p>
        `,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#28a745",
        cancelButtonColor: "#d33",
        confirmButtonText: "Sí, confirmar",
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

        // 3. INSERT detalle_venta lines
        const detalles = carrito.map(item => ({
            dv_vt_id_venta: venta.vt_id_venta,
            dv_pr_id_producto: item.pr_id_producto,
            dv_cantidad: item.cantidad,
            dv_precio_unitario: item.pr_precio_venta,
            dv_costo_unitario: item.pr_costo_compra,
            dv_subtotal: item.subtotal
        }));

        const { error: errDetalles } = await supabaseClient
            .from("detalle_venta")
            .insert(detalles);

        if (errDetalles) {
            await Swal.fire({ title: "Error", text: errDetalles.message, icon: "error" });
            return;
        }

        // 4. For each line: INSERT movimientos_inventario + UPDATE stock
        let productosStockBajo = [];

        for (const item of carrito) {
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

        // 5. Show success
        await Swal.fire({
            title: "Venta registrada",
            text: `Venta Nº ${nextNumero} registrada exitosamente.`,
            icon: "success",
            timer: 2500,
            showConfirmButton: false
        });

        // 6. Show stock bajo warnings
        if (productosStockBajo.length > 0) {
            const listaProductos = productosStockBajo.map(p =>
                `• ${p.nombre}: ${p.stock} unidades (mínimo: ${p.minimo})`
            ).join("<br>");

            await Swal.fire({
                title: "⚠️ Alerta de Stock Bajo",
                html: `Los siguientes productos están por debajo del stock mínimo:<br><br>${listaProductos}`,
                icon: "warning"
            });
        }

        // 7. Open receipt modal
        await generarRecibo(venta.vt_id_venta);

        // 8. Clear cart
        carrito = [];
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

// ================= RECEIPT GENERATION =================

async function generarRecibo(ventaId) {
    // Fetch venta with detalles and product names
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
        .select(`
            *,
            productos ( pr_nombre )
        `)
        .eq("dv_vt_id_venta", ventaId);

    if (errDetalles) {
        await Swal.fire({ title: "Error", text: errDetalles.message, icon: "error" });
        return;
    }

    // Render receipt
    const fechaVenta = new Date(venta.vt_fecha_venta).toLocaleDateString("es-CO");
    const nombreCliente = venta.vt_nombre_cliente || "Consumidor Final";

    let filasDetalle = "";
    (detalles || []).forEach(d => {
        const nombreProducto = d.productos ? d.productos.pr_nombre : `Producto #${d.dv_pr_id_producto}`;
        filasDetalle += `
            <tr>
                <td>${nombreProducto}</td>
                <td class="text-right">${d.dv_cantidad}</td>
                <td class="text-right">$${Number(d.dv_precio_unitario).toLocaleString("es-CO")}</td>
                <td class="text-right">$${Number(d.dv_subtotal).toLocaleString("es-CO")}</td>
            </tr>
        `;
    });

    const reciboHTML = `
        <div class="recibo-header">
            <h4>PetCare Bonamur</h4>
            <p>Clínica Veterinaria</p>
            <p>NIT: 000.000.000-0</p>
        </div>
        <div class="recibo-info">
            <span><strong>Recibo Nº:</strong> ${venta.vt_numero_venta}</span>
            <span><strong>Fecha:</strong> ${fechaVenta}</span>
            <span><strong>Cliente:</strong> ${nombreCliente}</span>
        </div>
        <table class="recibo-table">
            <thead>
                <tr>
                    <th>Producto</th>
                    <th class="text-right">Cant.</th>
                    <th class="text-right">Precio</th>
                    <th class="text-right">Subtotal</th>
                </tr>
            </thead>
            <tbody>
                ${filasDetalle}
            </tbody>
        </table>
        <div class="recibo-total">
            TOTAL: $${Number(venta.vt_total).toLocaleString("es-CO")}
        </div>
        <div class="recibo-footer">
            <p>¡Gracias por su compra!</p>
            <p>PetCare Bonamur — Cuidamos a quienes más quieres</p>
        </div>
    `;

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
        query = query.ilike("vt_nombre_cliente", `%${filtro.cliente}%`);
    }

    // Limit results
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
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">
                    No se encontraron ventas
                </td>
            </tr>`;
        return;
    }

    ventas.forEach(v => {
        const tr = document.createElement("tr");
        tr.classList.add("text-center");
        tr.innerHTML = `
            <td>${v.vt_numero_venta}</td>
            <td>${new Date(v.vt_fecha_venta).toLocaleDateString("es-CO")}</td>
            <td>${v.vt_nombre_cliente || "Consumidor Final"}</td>
            <td>$${Number(v.vt_total).toLocaleString("es-CO")}</td>
            <td>
                <button class="btn btn-info btn-accion btn-ver-recibo" data-id="${v.vt_id_venta}" title="Ver recibo">
                    🧾
                </button>
            </td>
        `;

        // View receipt button
        const btnRecibo = tr.querySelector(".btn-ver-recibo");
        btnRecibo.addEventListener("click", async function () {
            await generarRecibo(parseInt(this.dataset.id));
        });

        tbody.appendChild(tr);
    });
}
