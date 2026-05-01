// ================= CONFIG =================

const SUPABASE_URL = "https://nlqtzidfowoxylporidi.supabase.co";
const SUPABASE_KEY = "sb_publishable_Qe7khKcVgFoN1KpXydGbcA_mEddQQNi";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// ================= GLOBAL STATE =================

let productosCache = [];
// Categories that require fecha_vencimiento: 1=Medicamentos, 2=Alimentos, 4=Vacunas
const CATEGORIAS_CON_VENCIMIENTO = [1, 2, 4];

// ================= INITIALIZATION =================

document.addEventListener("DOMContentLoaded", async () => {
    await cargarCategorias();
    await cargarProveedores();
    await cargarProductos();
    await calcularAlertasStock();
    await calcularAlertasVencimiento();
    cargarProductosEnSelectAjuste();
});

// ================= LOAD PRODUCTS =================

async function cargarProductos() {
    const { data, error } = await supabaseClient
        .from("productos")
        .select(`
            *,
            categoria_producto ( cat_id_categoria, cat_nombre ),
            proveedores ( prov_id_proveedor, prov_nombre )
        `)
        .order("pr_nombre");

    if (error) {
        await Swal.fire({ title: "Error", text: error.message, icon: "error" });
        return;
    }

    productosCache = data || [];
    renderizarTablaProductos(productosCache);
}

function renderizarTablaProductos(productos) {
    const tbody = document.getElementById("tablaProductos");
    tbody.innerHTML = "";

    if (!productos || productos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center text-muted">
                    No hay productos registrados
                </td>
            </tr>`;
        return;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    productos.forEach(p => {
        const estado = obtenerEstadoProducto(p, hoy);
        const badgeClass = estado.badge;
        const badgeText = estado.texto;

        const fechaVenc = p.pr_fecha_vencimiento
            ? new Date(p.pr_fecha_vencimiento).toLocaleDateString("es-CO")
            : "N/A";

        tbody.innerHTML += `
        <tr class="text-center">
            <td>${p.pr_nombre}</td>
            <td>${p.categoria_producto ? p.categoria_producto.cat_nombre : "-"}</td>
            <td>${p.proveedores ? p.proveedores.prov_nombre : "-"}</td>
            <td>${p.pr_cantidad_disponible}</td>
            <td>${p.pr_stock_minimo}</td>
            <td>$${Number(p.pr_precio_venta).toLocaleString("es-CO")}</td>
            <td>${p.pr_lote}</td>
            <td>${fechaVenc}</td>
            <td><span class="badge badge-estado ${badgeClass}">${badgeText}</span></td>
            <td>
                <button class="btn btn-success btn-accion btn-editar-producto" data-id="${p.pr_id_producto}" title="Editar">
                    ✏️
                </button>
                <button class="btn btn-info btn-accion btn-ver-kardex" data-id="${p.pr_id_producto}" data-nombre="${p.pr_nombre}" title="Kardex">
                    📋
                </button>
                <button class="btn btn-warning btn-accion btn-ajustar-producto" data-id="${p.pr_id_producto}" title="Ajustar">
                    ⚖️
                </button>
            </td>
        </tr>`;
    });
}

function obtenerEstadoProducto(producto, hoy) {
    // Check if expired
    if (producto.pr_fecha_vencimiento) {
        const fechaVenc = new Date(producto.pr_fecha_vencimiento);
        fechaVenc.setHours(0, 0, 0, 0);

        if (fechaVenc < hoy) {
            return { badge: "badge-danger", texto: "Vencido" };
        }

        const en30Dias = new Date(hoy);
        en30Dias.setDate(en30Dias.getDate() + 30);

        if (fechaVenc <= en30Dias) {
            return { badge: "badge-warning", texto: "Próximo a vencer" };
        }
    }

    // Check stock bajo
    if (producto.pr_cantidad_disponible <= producto.pr_stock_minimo) {
        return { badge: "badge-danger", texto: "Stock bajo" };
    }

    return { badge: "badge-success", texto: "Normal" };
}

// ================= LOAD CATEGORIES =================

async function cargarCategorias() {
    const { data, error } = await supabaseClient
        .from("categoria_producto")
        .select("*")
        .order("cat_id_categoria");

    if (error) return;

    // Populate filter select
    const filtroSelect = document.getElementById("filtroCategoriaProducto");
    filtroSelect.innerHTML = '<option value="">Todas las categorías</option>';
    data.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat.cat_id_categoria;
        opt.textContent = cat.cat_nombre;
        filtroSelect.appendChild(opt);
    });

    // Populate product form select
    const formSelect = document.getElementById("pr_cat_id_categoria");
    formSelect.innerHTML = '<option value="">Seleccione</option>';
    data.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat.cat_id_categoria;
        opt.textContent = cat.cat_nombre;
        formSelect.appendChild(opt);
    });

    // Populate categories list in modal
    renderizarListaCategorias(data);
}

function renderizarListaCategorias(categorias) {
    const lista = document.getElementById("listaCategorias");
    lista.innerHTML = "";

    if (!categorias || categorias.length === 0) {
        lista.innerHTML = '<div class="categoria-item text-muted">No hay categorías</div>';
        return;
    }

    categorias.forEach(cat => {
        lista.innerHTML += `
            <div class="categoria-item">
                <span>${cat.cat_nombre}</span>
                <small class="text-muted">ID: ${cat.cat_id_categoria}</small>
            </div>`;
    });
}

// ================= LOAD PROVIDERS =================

async function cargarProveedores() {
    const { data, error } = await supabaseClient
        .from("proveedores")
        .select("prov_id_proveedor, prov_nombre")
        .order("prov_nombre");

    if (error) return;

    const formSelect = document.getElementById("pr_prov_id_proveedor");
    formSelect.innerHTML = '<option value="">Seleccione</option>';
    data.forEach(prov => {
        const opt = document.createElement("option");
        opt.value = prov.prov_id_proveedor;
        opt.textContent = prov.prov_nombre;
        formSelect.appendChild(opt);
    });
}

// ================= REGISTER PRODUCT =================

document.getElementById("formProducto")
    .addEventListener("submit", async function (e) {
        e.preventDefault();

        const idProducto = document.getElementById("pr_id_producto").value;

        const data = {
            pr_nombre: document.getElementById("pr_nombre").value.trim(),
            pr_descripcion: document.getElementById("pr_descripcion").value.trim(),
            pr_cat_id_categoria: parseInt(document.getElementById("pr_cat_id_categoria").value),
            pr_prov_id_proveedor: parseInt(document.getElementById("pr_prov_id_proveedor").value),
            pr_costo_compra: parseFloat(document.getElementById("pr_costo_compra").value),
            pr_precio_venta: parseFloat(document.getElementById("pr_precio_venta").value),
            pr_cantidad_disponible: parseInt(document.getElementById("pr_cantidad_disponible").value),
            pr_stock_minimo: parseInt(document.getElementById("pr_stock_minimo").value),
            pr_lote: document.getElementById("pr_lote").value.trim()
        };

        // Conditional fecha_vencimiento
        const fechaVencInput = document.getElementById("pr_fecha_vencimiento");
        if (!fechaVencInput.disabled && fechaVencInput.value) {
            data.pr_fecha_vencimiento = fechaVencInput.value;
        } else {
            data.pr_fecha_vencimiento = null;
        }

        // Validate required fields
        if (!data.pr_nombre || !data.pr_descripcion || !data.pr_cat_id_categoria ||
            !data.pr_prov_id_proveedor || isNaN(data.pr_costo_compra) || isNaN(data.pr_precio_venta) ||
            isNaN(data.pr_cantidad_disponible) || isNaN(data.pr_stock_minimo) || !data.pr_lote) {
            await Swal.fire({
                title: "Campos incompletos",
                text: "Por favor complete todos los campos obligatorios.",
                icon: "warning"
            });
            return;
        }

        // Validate precio_venta >= costo_compra
        if (data.pr_precio_venta < data.pr_costo_compra) {
            await Swal.fire({
                title: "Error de validación",
                text: "El precio de venta debe ser mayor o igual al costo de compra.",
                icon: "warning"
            });
            return;
        }

        if (idProducto) {
            await actualizarProducto(parseInt(idProducto), data);
        } else {
            await registrarProducto(data);
        }
    });

async function registrarProducto(data) {
    const { data: result, error } = await supabaseClient
        .from("productos")
        .insert(data)
        .select()
        .single();

    if (error) {
        if (error.code === "23505") {
            await Swal.fire({
                title: "Duplicado",
                text: "Ya existe un producto con ese nombre y lote.",
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
        title: "Producto registrado",
        icon: "success",
        timer: 2000,
        showConfirmButton: false
    });

    $('#modalRegistroProducto').modal('hide');
    document.getElementById("formProducto").reset();
    document.getElementById("pr_id_producto").value = "";
    document.getElementById("pr_fecha_vencimiento").disabled = true;

    await cargarProductos();
    await calcularAlertasStock();
    await calcularAlertasVencimiento();
    cargarProductosEnSelectAjuste();
}

async function actualizarProducto(id, data) {
    const { data: result, error } = await supabaseClient
        .from("productos")
        .update(data)
        .eq("pr_id_producto", id)
        .select()
        .single();

    if (error) {
        if (error.code === "23505") {
            await Swal.fire({
                title: "Duplicado",
                text: "Ya existe un producto con ese nombre y lote.",
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
        title: "Producto actualizado",
        icon: "success",
        timer: 2000,
        showConfirmButton: false
    });

    $('#modalRegistroProducto').modal('hide');
    document.getElementById("formProducto").reset();
    document.getElementById("pr_id_producto").value = "";
    document.getElementById("pr_fecha_vencimiento").disabled = true;

    await cargarProductos();
    await calcularAlertasStock();
    await calcularAlertasVencimiento();
    cargarProductosEnSelectAjuste();
}

// ================= REGISTER CATEGORY =================

document.getElementById("btnAgregarCategoria")
    .addEventListener("click", async function () {
        const nombre = document.getElementById("nuevaCategoriaNombre").value.trim();

        if (!nombre) {
            await Swal.fire({
                title: "Campo vacío",
                text: "Ingrese el nombre de la categoría.",
                icon: "warning"
            });
            return;
        }

        await registrarCategoria(nombre);
    });

async function registrarCategoria(nombre) {
    const { data, error } = await supabaseClient
        .from("categoria_producto")
        .insert({ cat_nombre: nombre })
        .select()
        .single();

    if (error) {
        if (error.code === "23505") {
            await Swal.fire({
                title: "Duplicado",
                text: "Ya existe una categoría con ese nombre.",
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
        title: "Categoría registrada",
        icon: "success",
        timer: 1500,
        showConfirmButton: false
    });

    document.getElementById("nuevaCategoriaNombre").value = "";
    await cargarCategorias();
}

// ================= KARDEX =================

async function verKardex(productoId, fechaInicio, fechaFin) {
    let query = supabaseClient
        .from("movimientos_inventario")
        .select(`
            *,
            tipo_movimiento_inventario ( tmi_id_tipo, tmi_tipo )
        `)
        .eq("mi_pr_id_producto", productoId)
        .order("mi_fecha", { ascending: false });

    if (fechaInicio) {
        query = query.gte("mi_fecha", fechaInicio);
    }
    if (fechaFin) {
        query = query.lte("mi_fecha", fechaFin);
    }

    const { data, error } = await query;

    if (error) {
        await Swal.fire({ title: "Error", text: error.message, icon: "error" });
        return;
    }

    renderizarTablaKardex(data || []);
}

function renderizarTablaKardex(movimientos) {
    const tbody = document.getElementById("tablaKardex");
    tbody.innerHTML = "";

    if (!movimientos || movimientos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">
                    Sin movimientos registrados
                </td>
            </tr>`;
        return;
    }

    movimientos.forEach(m => {
        const tipo = m.tipo_movimiento_inventario ? m.tipo_movimiento_inventario.tmi_tipo : "-";
        const esEntrada = tipo === "entrada_compra" || tipo === "ajuste_positivo";
        const entrada = esEntrada ? m.mi_cantidad : "";
        const salida = !esEntrada ? m.mi_cantidad : "";

        let referencia = "-";
        if (m.mi_referencia_orden) referencia = `OC-${m.mi_referencia_orden}`;
        if (m.mi_referencia_venta) referencia = `VT-${m.mi_referencia_venta}`;
        if (m.mi_notas) referencia = m.mi_notas;

        tbody.innerHTML += `
        <tr class="text-center">
            <td>${new Date(m.mi_fecha).toLocaleDateString("es-CO")}</td>
            <td>${tipo.replace(/_/g, " ")}</td>
            <td>${referencia}</td>
            <td class="text-success">${entrada}</td>
            <td class="text-danger">${salida}</td>
            <td>$${Number(m.mi_costo_unitario).toLocaleString("es-CO")}</td>
            <td><strong>${m.mi_saldo_resultante}</strong></td>
        </tr>`;
    });
}

// Kardex filter button
document.getElementById("btnFiltrarKardex")
    .addEventListener("click", function () {
        const productoId = document.getElementById("kardexProductoId").value;
        const fechaInicio = document.getElementById("kardexFechaInicio").value || null;
        const fechaFin = document.getElementById("kardexFechaFin").value || null;

        if (productoId) {
            verKardex(parseInt(productoId), fechaInicio, fechaFin);
        }
    });

// ================= INVENTORY ADJUSTMENT =================

document.getElementById("formAjuste")
    .addEventListener("submit", async function (e) {
        e.preventDefault();

        const productoId = parseInt(document.getElementById("ajuste_producto").value);
        const tipo = document.getElementById("ajuste_tipo").value;
        const cantidad = parseInt(document.getElementById("ajuste_cantidad").value);
        const motivo = document.getElementById("ajuste_motivo").value.trim();

        if (!productoId || !tipo || !cantidad || !motivo) {
            await Swal.fire({
                title: "Campos incompletos",
                text: "Por favor complete todos los campos.",
                icon: "warning"
            });
            return;
        }

        if (cantidad <= 0) {
            await Swal.fire({
                title: "Cantidad inválida",
                text: "La cantidad debe ser mayor a 0.",
                icon: "warning"
            });
            return;
        }

        await registrarAjuste({ productoId, tipo, cantidad, motivo });
    });

async function registrarAjuste(data) {
    // Get current product info
    const { data: producto, error: errProd } = await supabaseClient
        .from("productos")
        .select("*")
        .eq("pr_id_producto", data.productoId)
        .single();

    if (errProd || !producto) {
        await Swal.fire({ title: "Error", text: "Producto no encontrado.", icon: "error" });
        return;
    }

    const esPositivo = data.tipo === "ajuste_positivo";
    const tipoId = esPositivo ? 3 : 4; // 3=ajuste_positivo, 4=ajuste_negativo
    const nuevoStock = esPositivo
        ? producto.pr_cantidad_disponible + data.cantidad
        : producto.pr_cantidad_disponible - data.cantidad;

    if (nuevoStock < 0) {
        await Swal.fire({
            title: "Stock insuficiente",
            text: `No se puede restar ${data.cantidad} unidades. Stock actual: ${producto.pr_cantidad_disponible}.`,
            icon: "error"
        });
        return;
    }

    // Insert movement
    const movimiento = {
        mi_pr_id_producto: data.productoId,
        mi_tmi_id_tipo: tipoId,
        mi_cantidad: data.cantidad,
        mi_costo_unitario: producto.pr_costo_compra,
        mi_saldo_resultante: nuevoStock,
        mi_notas: data.motivo
    };

    const { error: errMov } = await supabaseClient
        .from("movimientos_inventario")
        .insert(movimiento);

    if (errMov) {
        await Swal.fire({ title: "Error", text: errMov.message, icon: "error" });
        return;
    }

    // Update product stock
    const { error: errUpdate } = await supabaseClient
        .from("productos")
        .update({ pr_cantidad_disponible: nuevoStock })
        .eq("pr_id_producto", data.productoId);

    if (errUpdate) {
        await Swal.fire({ title: "Error", text: errUpdate.message, icon: "error" });
        return;
    }

    await Swal.fire({
        title: "Ajuste registrado",
        icon: "success",
        timer: 2000,
        showConfirmButton: false
    });

    // Check if stock dropped below minimum after negative adjustment
    if (!esPositivo && nuevoStock <= producto.pr_stock_minimo) {
        await Swal.fire({
            title: "⚠️ Stock bajo",
            text: `El producto "${producto.pr_nombre}" tiene ahora ${nuevoStock} unidades, por debajo del mínimo (${producto.pr_stock_minimo}).`,
            icon: "warning"
        });
    }

    $('#modalAjuste').modal('hide');
    document.getElementById("formAjuste").reset();

    await cargarProductos();
    await calcularAlertasStock();
    await calcularAlertasVencimiento();
    cargarProductosEnSelectAjuste();
}

// ================= STOCK ALERTS =================

async function calcularAlertasStock() {
    const { data, error } = await supabaseClient
        .from("productos")
        .select("pr_id_producto, pr_cantidad_disponible, pr_stock_minimo");

    if (error) return;

    const stockBajo = (data || []).filter(p => p.pr_cantidad_disponible <= p.pr_stock_minimo);
    document.getElementById("countStockBajo").textContent = stockBajo.length;
}

// ================= EXPIRATION ALERTS =================

async function calcularAlertasVencimiento() {
    const { data, error } = await supabaseClient
        .from("productos")
        .select("pr_id_producto, pr_fecha_vencimiento")
        .not("pr_fecha_vencimiento", "is", null);

    if (error) return;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const en30Dias = new Date(hoy);
    en30Dias.setDate(en30Dias.getDate() + 30);

    let proximosVencer = 0;
    let vencidos = 0;

    (data || []).forEach(p => {
        const fechaVenc = new Date(p.pr_fecha_vencimiento);
        fechaVenc.setHours(0, 0, 0, 0);

        if (fechaVenc < hoy) {
            vencidos++;
        } else if (fechaVenc <= en30Dias) {
            proximosVencer++;
        }
    });

    document.getElementById("countProximosVencer").textContent = proximosVencer;
    document.getElementById("countVencidos").textContent = vencidos;
}

// ================= FILTER PRODUCTS =================

function filtrarProductos() {
    const categoriaId = document.getElementById("filtroCategoriaProducto").value;
    const busqueda = document.getElementById("buscarProducto").value.toLowerCase().trim();

    let filtrados = productosCache;

    if (categoriaId) {
        filtrados = filtrados.filter(p => p.pr_cat_id_categoria === parseInt(categoriaId));
    }

    if (busqueda) {
        filtrados = filtrados.filter(p =>
            p.pr_nombre.toLowerCase().includes(busqueda) ||
            (p.pr_lote && p.pr_lote.toLowerCase().includes(busqueda))
        );
    }

    renderizarTablaProductos(filtrados);
}

// Filter event listeners
document.getElementById("filtroCategoriaProducto")
    .addEventListener("change", filtrarProductos);

document.getElementById("buscarProducto")
    .addEventListener("input", filtrarProductos);

// ================= CONDITIONAL FECHA VENCIMIENTO =================

document.getElementById("pr_cat_id_categoria")
    .addEventListener("change", function () {
        const categoriaId = parseInt(this.value);
        const fechaInput = document.getElementById("pr_fecha_vencimiento");
        const msgFecha = document.getElementById("msgFechaVencimiento");

        if (CATEGORIAS_CON_VENCIMIENTO.includes(categoriaId)) {
            fechaInput.disabled = false;
            msgFecha.textContent = "Este tipo de producto requiere fecha de vencimiento";
            msgFecha.classList.remove("text-muted");
            msgFecha.classList.add("text-info");
        } else {
            fechaInput.disabled = true;
            fechaInput.value = "";
            msgFecha.textContent = "Seleccione una categoría que requiera fecha de vencimiento";
            msgFecha.classList.remove("text-info");
            msgFecha.classList.add("text-muted");
        }
    });

// ================= EDIT PRODUCT =================

document.addEventListener("click", async function (e) {
    // Edit product button
    if (e.target.classList.contains("btn-editar-producto") || e.target.closest(".btn-editar-producto")) {
        const btn = e.target.classList.contains("btn-editar-producto") ? e.target : e.target.closest(".btn-editar-producto");
        const id = parseInt(btn.dataset.id);
        await abrirEditarProducto(id);
    }

    // Kardex button
    if (e.target.classList.contains("btn-ver-kardex") || e.target.closest(".btn-ver-kardex")) {
        const btn = e.target.classList.contains("btn-ver-kardex") ? e.target : e.target.closest(".btn-ver-kardex");
        const id = parseInt(btn.dataset.id);
        const nombre = btn.dataset.nombre;
        abrirKardex(id, nombre);
    }

    // Adjust button from table
    if (e.target.classList.contains("btn-ajustar-producto") || e.target.closest(".btn-ajustar-producto")) {
        const btn = e.target.classList.contains("btn-ajustar-producto") ? e.target : e.target.closest(".btn-ajustar-producto");
        const id = parseInt(btn.dataset.id);
        document.getElementById("ajuste_producto").value = id;
        $('#modalAjuste').modal('show');
    }
});

async function abrirEditarProducto(id) {
    const producto = productosCache.find(p => p.pr_id_producto === id);
    if (!producto) return;

    document.getElementById("pr_id_producto").value = producto.pr_id_producto;
    document.getElementById("pr_nombre").value = producto.pr_nombre;
    document.getElementById("pr_descripcion").value = producto.pr_descripcion;
    document.getElementById("pr_cat_id_categoria").value = producto.pr_cat_id_categoria;
    document.getElementById("pr_prov_id_proveedor").value = producto.pr_prov_id_proveedor;
    document.getElementById("pr_costo_compra").value = producto.pr_costo_compra;
    document.getElementById("pr_precio_venta").value = producto.pr_precio_venta;
    document.getElementById("pr_cantidad_disponible").value = producto.pr_cantidad_disponible;
    document.getElementById("pr_stock_minimo").value = producto.pr_stock_minimo;
    document.getElementById("pr_lote").value = producto.pr_lote;

    // Handle fecha_vencimiento conditional field
    const fechaInput = document.getElementById("pr_fecha_vencimiento");
    const msgFecha = document.getElementById("msgFechaVencimiento");

    if (CATEGORIAS_CON_VENCIMIENTO.includes(producto.pr_cat_id_categoria)) {
        fechaInput.disabled = false;
        fechaInput.value = producto.pr_fecha_vencimiento || "";
        msgFecha.textContent = "Este tipo de producto requiere fecha de vencimiento";
        msgFecha.classList.remove("text-muted");
        msgFecha.classList.add("text-info");
    } else {
        fechaInput.disabled = true;
        fechaInput.value = "";
        msgFecha.textContent = "Seleccione una categoría que requiera fecha de vencimiento";
        msgFecha.classList.remove("text-info");
        msgFecha.classList.add("text-muted");
    }

    document.getElementById("modalRegistroProductoLabel").textContent = "Editar Producto";
    $('#modalRegistroProducto').modal('show');
}

// Reset modal title when opening for new product
document.getElementById("btnNuevoProducto")
    .addEventListener("click", function () {
        document.getElementById("formProducto").reset();
        document.getElementById("pr_id_producto").value = "";
        document.getElementById("pr_fecha_vencimiento").disabled = true;
        document.getElementById("msgFechaVencimiento").textContent = "Seleccione una categoría que requiera fecha de vencimiento";
        document.getElementById("modalRegistroProductoLabel").textContent = "Registro de Producto";
    });

// ================= OPEN KARDEX =================

function abrirKardex(productoId, productoNombre) {
    document.getElementById("kardexProductoId").value = productoId;
    document.getElementById("kardexProductoNombre").textContent = productoNombre;
    document.getElementById("kardexFechaInicio").value = "";
    document.getElementById("kardexFechaFin").value = "";

    verKardex(productoId, null, null);
    $('#modalKardex').modal('show');
}

// ================= LOAD PRODUCTS INTO ADJUSTMENT SELECT =================

function cargarProductosEnSelectAjuste() {
    const select = document.getElementById("ajuste_producto");
    select.innerHTML = '<option value="">Seleccione un producto</option>';

    productosCache.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.pr_id_producto;
        opt.textContent = `${p.pr_nombre} (Lote: ${p.pr_lote} | Stock: ${p.pr_cantidad_disponible})`;
        select.appendChild(opt);
    });
}
