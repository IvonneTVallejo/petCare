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


// ================= GESTIÓN MASIVA CSV =================

// --- Constants ---
const ENCABEZADOS_PLANTILLA = ['pr_nombre', 'pr_descripcion', 'pr_cat_id_categoria', 'pr_prov_id_proveedor', 'pr_costo_compra', 'pr_precio_venta', 'pr_cantidad_disponible', 'pr_stock_minimo', 'pr_lote', 'pr_fecha_vencimiento'];
const ENCABEZADOS_ACTUALIZACION = ['pr_id_producto', ...ENCABEZADOS_PLANTILLA];
const CAMPOS_OBLIGATORIOS_CSV = ['pr_nombre', 'pr_descripcion', 'pr_cat_id_categoria', 'pr_prov_id_proveedor', 'pr_costo_compra', 'pr_precio_venta', 'pr_cantidad_disponible', 'pr_stock_minimo', 'pr_lote'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// --- Excel/CSV Generation ---
function descargarCSV(contenido, nombreArchivo) {
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    link.click();
    URL.revokeObjectURL(url);
}

async function descargarPlantillaProductosNuevos() {
    const ejemplo = {
        pr_nombre: 'Producto Ejemplo',
        pr_descripcion: 'Descripción del producto',
        pr_cat_id_categoria: 1,
        pr_prov_id_proveedor: 1,
        pr_costo_compra: 10000,
        pr_precio_venta: 15000,
        pr_cantidad_disponible: 100,
        pr_stock_minimo: 10,
        pr_lote: 'LOTE001',
        pr_fecha_vencimiento: '2027-12-31'
    };

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Plantilla');

    // Agregar encabezados
    sheet.addRow(ENCABEZADOS_PLANTILLA);
    // Agregar fila de ejemplo
    sheet.addRow(ENCABEZADOS_PLANTILLA.map(h => ejemplo[h]));

    // Estilo encabezados: negrita + fondo gris
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
        cell.protection = { locked: true };
    });

    // Desbloquear celdas de datos (fila 2 en adelante)
    for (let R = 2; R <= sheet.rowCount; R++) {
        sheet.getRow(R).eachCell(cell => {
            cell.protection = { locked: false };
        });
    }

    // Auto-ajustar ancho de columnas
    sheet.columns.forEach((col, idx) => {
        const header = ENCABEZADOS_PLANTILLA[idx] || '';
        const valLen = ejemplo[header] !== undefined ? String(ejemplo[header]).length : 0;
        col.width = Math.min(Math.max(header.length, valLen) + 3, 40);
    });

    // Proteger la hoja (encabezados bloqueados, datos editables)
    await sheet.protect('', { selectLockedCells: true, selectUnlockedCells: true });

    // Descargar
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla_productos_nuevos.xlsx';
    link.click();
    URL.revokeObjectURL(url);

    Swal.fire({ title: 'Plantilla descargada', icon: 'success', timer: 1500, showConfirmButton: false });
}

async function descargarInventarioActual() {
    const { data, error } = await supabaseClient
        .from('productos')
        .select('pr_id_producto, pr_nombre, pr_descripcion, pr_cat_id_categoria, pr_prov_id_proveedor, pr_costo_compra, pr_precio_venta, pr_cantidad_disponible, pr_stock_minimo, pr_lote, pr_fecha_vencimiento')
        .order('pr_id_producto');

    if (error) {
        await Swal.fire({ title: 'Error', text: error.message, icon: 'error' });
        return;
    }

    if (!data || data.length === 0) {
        await Swal.fire({ title: 'Sin datos', text: 'No hay productos en el inventario.', icon: 'info' });
        return;
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Inventario');

    // Agregar encabezados
    sheet.addRow(ENCABEZADOS_ACTUALIZACION);

    // Agregar datos
    data.forEach(p => {
        const fila = ENCABEZADOS_ACTUALIZACION.map(col => p[col] !== null && p[col] !== undefined ? p[col] : '');
        sheet.addRow(fila);
    });

    // Estilo encabezados: negrita + fondo gris + bloqueados
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
        cell.protection = { locked: true };
    });

    // Configurar protección por celda
    for (let R = 2; R <= sheet.rowCount; R++) {
        const row = sheet.getRow(R);
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            if (colNumber === 1) {
                // Columna A (pr_id_producto) - BLOQUEADA + fondo gris
                cell.protection = { locked: true };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
            } else {
                // Resto de columnas - DESBLOQUEADAS
                cell.protection = { locked: false };
            }
        });
    }

    // Auto-ajustar ancho de columnas
    sheet.columns.forEach((col, idx) => {
        const header = ENCABEZADOS_ACTUALIZACION[idx] || '';
        let maxLen = header.length;
        data.forEach(p => {
            const val = p[header];
            if (val !== null && val !== undefined) {
                const len = String(val).length;
                if (len > maxLen) maxLen = len;
            }
        });
        col.width = Math.min(maxLen + 3, 40);
    });

    // Proteger la hoja
    await sheet.protect('', { selectLockedCells: true, selectUnlockedCells: true });

    // Descargar
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventario_actual_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);

    Swal.fire({ title: 'Inventario descargado', icon: 'success', timer: 1500, showConfirmButton: false });
}

// --- File Parsing (CSV & Excel) ---
function parsearArchivoCSV(archivo) {
    const extension = archivo.name.toLowerCase();
    
    // Si es Excel, usar SheetJS
    if (extension.endsWith('.xlsx') || extension.endsWith('.xls')) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const workbook = XLSX.read(e.target.result, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
                    const fields = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
                    resolve({ data: jsonData, meta: { fields }, errors: [] });
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error('Error al leer el archivo'));
            reader.readAsArrayBuffer(archivo);
        });
    }
    
    // Si es CSV, usar Papa Parse
    return new Promise((resolve, reject) => {
        Papa.parse(archivo, {
            header: true,
            skipEmptyLines: false,
            encoding: 'UTF-8',
            complete: (results) => resolve(results),
            error: (err) => reject(err)
        });
    });
}

// --- Validation ---
function validarExtensionArchivo(nombre) {
    if (!nombre) return false;
    const ext = nombre.toLowerCase();
    return ext.endsWith('.csv') || ext.endsWith('.xlsx') || ext.endsWith('.xls');
}

function validarFormatoFecha(fecha) {
    if (!fecha || String(fecha).trim() === '') return { valido: true, error: null };
    const str = String(fecha).trim();
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(str)) return { valido: false, error: 'Formato debe ser YYYY-MM-DD' };
    const parts = str.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (month < 1 || month > 12) return { valido: false, error: 'Mes inválido' };
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) return { valido: false, error: 'Día inválido para el mes' };
    return { valido: true, error: null };
}

function validarFilaProducto(fila, categoriasValidas, proveedoresValidos, modo) {
    const errores = [];

    // Required fields
    CAMPOS_OBLIGATORIOS_CSV.forEach(campo => {
        if (!fila[campo] || String(fila[campo]).trim() === '') {
            errores.push(`Campo "${campo}" es obligatorio`);
        }
    });

    // If in update mode, validate pr_id_producto
    if (modo === 'actualizacion') {
        if (!fila.pr_id_producto || isNaN(parseInt(fila.pr_id_producto))) {
            errores.push('pr_id_producto debe ser un número válido');
        }
    }

    // Numeric validations
    const costo = parseFloat(fila.pr_costo_compra);
    const precio = parseFloat(fila.pr_precio_venta);
    const cantidad = parseInt(fila.pr_cantidad_disponible);
    const stockMin = parseInt(fila.pr_stock_minimo);

    if (fila.pr_costo_compra && String(fila.pr_costo_compra).trim() !== '' && (isNaN(costo) || costo <= 0)) errores.push('pr_costo_compra debe ser un número positivo');
    if (fila.pr_precio_venta && String(fila.pr_precio_venta).trim() !== '' && (isNaN(precio) || precio <= 0)) errores.push('pr_precio_venta debe ser un número positivo');
    if (fila.pr_cantidad_disponible && String(fila.pr_cantidad_disponible).trim() !== '' && (isNaN(cantidad) || cantidad < 0)) errores.push('pr_cantidad_disponible debe ser un entero >= 0');
    if (fila.pr_stock_minimo && String(fila.pr_stock_minimo).trim() !== '' && (isNaN(stockMin) || stockMin < 0)) errores.push('pr_stock_minimo debe ser un entero >= 0');
    if (!isNaN(costo) && !isNaN(precio) && costo > 0 && precio > 0 && precio < costo) errores.push('pr_precio_venta debe ser >= pr_costo_compra');

    // Referential integrity
    const catId = parseInt(fila.pr_cat_id_categoria);
    const provId = parseInt(fila.pr_prov_id_proveedor);
    if (!isNaN(catId) && !categoriasValidas.includes(catId)) errores.push(`Categoría ${catId} no existe`);
    if (!isNaN(provId) && !proveedoresValidos.includes(provId)) errores.push(`Proveedor ${provId} no existe`);

    // Date validation
    if (fila.pr_fecha_vencimiento && String(fila.pr_fecha_vencimiento).trim() !== '') {
        const vFecha = validarFormatoFecha(fila.pr_fecha_vencimiento);
        if (!vFecha.valido) errores.push(`pr_fecha_vencimiento: ${vFecha.error}`);
    }

    return { valida: errores.length === 0, errores };
}

function detectarDuplicadosInternos(filas) {
    const duplicados = new Set();
    const vistos = {};
    filas.forEach((fila, idx) => {
        const key = `${(fila.pr_nombre || '').trim().toLowerCase()}|${(fila.pr_lote || '').trim().toLowerCase()}`;
        if (vistos[key] !== undefined) {
            duplicados.add(vistos[key]);
            duplicados.add(idx);
        } else {
            vistos[key] = idx;
        }
    });
    return duplicados;
}

function filtrarFilasVacias(filas) {
    return filas.filter(fila => {
        return Object.values(fila).some(val => val !== null && val !== undefined && String(val).trim() !== '');
    });
}

// --- Main Validation Orchestrator ---
async function validarArchivoCompleto(archivo, modo) {
    // 1. Extension
    if (!validarExtensionArchivo(archivo.name)) {
        return { error: 'El archivo debe tener extensión .csv, .xlsx o .xls' };
    }

    // 2. Size
    if (archivo.size > MAX_FILE_SIZE) {
        return { error: 'El archivo excede el límite de 5 MB' };
    }

    // 3. Parse
    let resultado;
    try {
        resultado = await parsearArchivoCSV(archivo);
    } catch (err) {
        return { error: 'Error al leer el archivo CSV: ' + err.message };
    }

    // 4. Check headers
    const encabezadosEsperados = modo === 'carga' ? ENCABEZADOS_PLANTILLA : ENCABEZADOS_ACTUALIZACION;
    const encabezadosArchivo = resultado.meta.fields || [];

    // Filter out comment rows (starting with #)
    let filas = resultado.data.filter(fila => {
        const primerValor = Object.values(fila)[0];
        return !primerValor || !String(primerValor).startsWith('#');
    });

    // Check headers match
    const headersMatch = encabezadosEsperados.every(h => encabezadosArchivo.includes(h));
    if (!headersMatch) {
        return { error: `Encabezados incorrectos. Esperados: ${encabezadosEsperados.join(', ')}` };
    }

    // 5. Filter empty rows
    filas = filtrarFilasVacias(filas);

    if (filas.length === 0) {
        return { error: 'El archivo no contiene datos para procesar' };
    }

    // 6. Get valid IDs for referential integrity
    const { data: cats } = await supabaseClient.from('categoria_producto').select('cat_id_categoria');
    const { data: provs } = await supabaseClient.from('proveedores').select('prov_id_proveedor');
    const categoriasValidas = (cats || []).map(c => c.cat_id_categoria);
    const proveedoresValidos = (provs || []).map(p => p.prov_id_proveedor);

    // For update mode, get existing product IDs
    let productosExistentes = [];
    if (modo === 'actualizacion') {
        const { data: prods } = await supabaseClient.from('productos').select('pr_id_producto');
        productosExistentes = (prods || []).map(p => p.pr_id_producto);
    }

    // 7. Validate each row
    const filasValidas = [];
    const filasConError = [];
    const duplicados = modo === 'carga' ? detectarDuplicadosInternos(filas) : new Set();

    filas.forEach((fila, idx) => {
        const validacion = validarFilaProducto(fila, categoriasValidas, proveedoresValidos, modo);
        let errores = [...validacion.errores];

        // Check duplicates (only for new products)
        if (modo === 'carga' && duplicados.has(idx)) {
            errores.push('Duplicado interno: mismo nombre + lote en otra fila');
        }

        // Check product exists (only for update)
        if (modo === 'actualizacion' && fila.pr_id_producto) {
            const id = parseInt(fila.pr_id_producto);
            if (!productosExistentes.includes(id)) {
                errores.push('Producto no encontrado - no se permiten productos nuevos en actualización masiva');
            }
        }

        if (errores.length === 0) {
            filasValidas.push({ numeroFila: idx + 2, datos: fila, estado: 'valida', errores: [] });
        } else {
            filasConError.push({ numeroFila: idx + 2, datos: fila, estado: 'error', errores });
        }
    });

    return { filasValidas, filasConError, totalFilas: filas.length };
}

// --- Processing ---
async function procesarFilasMasivas(filasValidas, modo, onProgreso) {
    let exitosos = 0;
    let fallidos = 0;
    const erroresDB = [];

    for (let i = 0; i < filasValidas.length; i++) {
        const fila = filasValidas[i].datos;

        const productoData = {
            pr_nombre: fila.pr_nombre.trim(),
            pr_descripcion: fila.pr_descripcion.trim(),
            pr_cat_id_categoria: parseInt(fila.pr_cat_id_categoria),
            pr_prov_id_proveedor: parseInt(fila.pr_prov_id_proveedor),
            pr_costo_compra: parseFloat(fila.pr_costo_compra),
            pr_precio_venta: parseFloat(fila.pr_precio_venta),
            pr_cantidad_disponible: parseInt(fila.pr_cantidad_disponible),
            pr_stock_minimo: parseInt(fila.pr_stock_minimo),
            pr_lote: fila.pr_lote.trim(),
            pr_fecha_vencimiento: fila.pr_fecha_vencimiento && String(fila.pr_fecha_vencimiento).trim() !== '' ? fila.pr_fecha_vencimiento.trim() : null
        };

        let error;
        if (modo === 'carga') {
            const { error: err } = await supabaseClient.from('productos').insert(productoData);
            error = err;
        } else {
            const { error: err } = await supabaseClient.from('productos').update(productoData).eq('pr_id_producto', parseInt(fila.pr_id_producto));
            error = err;
        }

        if (error) {
            fallidos++;
            let msg = error.message;
            if (error.code === '23505') msg = 'Ya existe un producto con ese nombre y lote';
            erroresDB.push({ fila: filasValidas[i].numeroFila, mensaje: msg });
        } else {
            exitosos++;
        }

        if (onProgreso) onProgreso(i + 1, filasValidas.length);
    }

    return { exitosos, fallidos, total: filasValidas.length, erroresDB };
}

// --- UI Functions ---
function renderizarPreview(resultado, containerId) {
    const container = document.getElementById(containerId);
    const todas = [...resultado.filasValidas, ...resultado.filasConError].sort((a, b) => a.numeroFila - b.numeroFila);

    let html = '<table class="table table-sm table-striped" style="font-size:11px;"><thead><tr><th>Fila</th><th>Estado</th><th>Nombre</th><th>Lote</th><th>Errores</th></tr></thead><tbody>';
    todas.forEach(f => {
        const badge = f.estado === 'valida' ? '<span class="badge badge-success">Válida</span>' : '<span class="badge badge-danger">Error</span>';
        const erroresText = f.errores.length > 0 ? f.errores.join('; ') : '-';
        html += `<tr><td>${f.numeroFila}</td><td>${badge}</td><td>${f.datos.pr_nombre || '-'}</td><td>${f.datos.pr_lote || '-'}</td><td>${erroresText}</td></tr>`;
    });
    html += '</tbody></table>';
    html += `<p class="mt-2"><strong>Válidas: ${resultado.filasValidas.length}</strong> | <strong class="text-danger">Con errores: ${resultado.filasConError.length}</strong> | Total: ${resultado.totalFilas}</p>`;

    container.innerHTML = html;
    container.style.display = 'block';
}

function actualizarProgreso(progressId, actual, total) {
    const container = document.getElementById(progressId);
    container.style.display = 'block';
    const pct = Math.round((actual / total) * 100);
    container.innerHTML = `<div class="progress"><div class="progress-bar bg-success" style="width:${pct}%">${pct}%</div></div>`;
}

function mostrarResumen(resumenId, resultado, modo) {
    const container = document.getElementById(resumenId);
    const accion = modo === 'carga' ? 'creados' : 'actualizados';
    container.innerHTML = `
        <div class="alert alert-info mt-3">
            <h6>Resumen de la operación</h6>
            <p>✅ Productos ${accion}: <strong>${resultado.exitosos}</strong></p>
            <p>❌ Errores de BD: <strong>${resultado.fallidos}</strong></p>
            <p>📊 Total procesados: <strong>${resultado.total}</strong></p>
        </div>
    `;
    container.style.display = 'block';
}

function descargarReporteErrores(filasConError, erroresDB) {
    const todas = [
        ...filasConError.map(f => ({ Fila: f.numeroFila, Nombre: f.datos.pr_nombre || '', Error: f.errores.join('; ') })),
        ...erroresDB.map(e => ({ Fila: e.fila, Nombre: '', Error: e.mensaje }))
    ];
    // Usar SheetJS para reporte simple (no necesita protección)
    const ws = XLSX.utils.json_to_sheet(todas, { header: ['Fila', 'Nombre', 'Error'] });
    ws['!cols'] = [{ wch: 8 }, { wch: 30 }, { wch: 60 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Errores');
    XLSX.writeFile(wb, 'reporte_errores.xlsx');
}

// --- Audit ---
async function registrarOperacionMasiva(tipo, exitosos, rechazados, total) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const email = user.email || 'desconocido';
    await supabaseClient.from('log_operaciones_masivas').insert({
        lom_usuario_email: email,
        lom_tipo_operacion: tipo,
        lom_registros_exitosos: exitosos,
        lom_registros_rechazados: rechazados,
        lom_total_procesados: total
    });
}

// --- Event Listeners for Bulk Operations ---
let resultadoValidacionCarga = null;
let resultadoValidacionActualizacion = null;

// Download template
document.getElementById('btnDescargarPlantilla').addEventListener('click', descargarPlantillaProductosNuevos);

// Download current inventory
document.getElementById('btnDescargarInventario').addEventListener('click', descargarInventarioActual);

// Upload for new products
document.getElementById('btnCargarPlantilla').addEventListener('click', async function() {
    const input = document.getElementById('inputCargaMasiva');
    if (!input.files || input.files.length === 0) {
        await Swal.fire({ title: 'Sin archivo', text: 'Seleccione un archivo CSV.', icon: 'warning' });
        return;
    }

    const resultado = await validarArchivoCompleto(input.files[0], 'carga');
    if (resultado.error) {
        await Swal.fire({ title: 'Error', text: resultado.error, icon: 'error' });
        return;
    }

    resultadoValidacionCarga = resultado;
    renderizarPreview(resultado, 'previewCarga');
    document.getElementById('accionesCarga').style.display = 'block';
});

// Confirm new products
document.getElementById('btnConfirmarCarga').addEventListener('click', async function() {
    if (!resultadoValidacionCarga || resultadoValidacionCarga.filasValidas.length === 0) {
        await Swal.fire({ title: 'Sin datos', text: 'No hay filas válidas para procesar.', icon: 'warning' });
        return;
    }

    const confirm = await Swal.fire({ title: '¿Confirmar carga?', text: `Se crearán ${resultadoValidacionCarga.filasValidas.length} productos.`, icon: 'question', showCancelButton: true, confirmButtonText: 'Sí, crear', cancelButtonText: 'Cancelar' });
    if (!confirm.isConfirmed) return;

    document.getElementById('accionesCarga').style.display = 'none';
    const resultado = await procesarFilasMasivas(resultadoValidacionCarga.filasValidas, 'carga', (actual, total) => actualizarProgreso('progressCarga', actual, total));
    mostrarResumen('resumenCarga', resultado, 'carga');
    await registrarOperacionMasiva('carga_nuevos', resultado.exitosos, resultado.fallidos + resultadoValidacionCarga.filasConError.length, resultadoValidacionCarga.totalFilas);
    await cargarProductos();
    await calcularAlertasStock();
    await calcularAlertasVencimiento();
});

// Upload for update
document.getElementById('btnCargarActualizacion').addEventListener('click', async function() {
    const input = document.getElementById('inputActualizacion');
    if (!input.files || input.files.length === 0) {
        await Swal.fire({ title: 'Sin archivo', text: 'Seleccione un archivo CSV.', icon: 'warning' });
        return;
    }

    const resultado = await validarArchivoCompleto(input.files[0], 'actualizacion');
    if (resultado.error) {
        await Swal.fire({ title: 'Error', text: resultado.error, icon: 'error' });
        return;
    }

    resultadoValidacionActualizacion = resultado;
    renderizarPreview(resultado, 'previewActualizacion');
    document.getElementById('accionesActualizacion').style.display = 'block';
});

// Confirm update
document.getElementById('btnConfirmarActualizacion').addEventListener('click', async function() {
    if (!resultadoValidacionActualizacion || resultadoValidacionActualizacion.filasValidas.length === 0) {
        await Swal.fire({ title: 'Sin datos', text: 'No hay filas válidas para procesar.', icon: 'warning' });
        return;
    }

    const confirm = await Swal.fire({ title: '¿Confirmar actualización?', text: `Se actualizarán ${resultadoValidacionActualizacion.filasValidas.length} productos.`, icon: 'question', showCancelButton: true, confirmButtonText: 'Sí, actualizar', cancelButtonText: 'Cancelar' });
    if (!confirm.isConfirmed) return;

    document.getElementById('accionesActualizacion').style.display = 'none';
    const resultado = await procesarFilasMasivas(resultadoValidacionActualizacion.filasValidas, 'actualizacion', (actual, total) => actualizarProgreso('progressActualizacion', actual, total));
    mostrarResumen('resumenActualizacion', resultado, 'actualizacion');
    await registrarOperacionMasiva('actualizacion', resultado.exitosos, resultado.fallidos + resultadoValidacionActualizacion.filasConError.length, resultadoValidacionActualizacion.totalFilas);
    await cargarProductos();
    await calcularAlertasStock();
    await calcularAlertasVencimiento();
});

// Cancel buttons
document.getElementById('btnCancelarCarga').addEventListener('click', function() {
    document.getElementById('previewCarga').style.display = 'none';
    document.getElementById('accionesCarga').style.display = 'none';
    document.getElementById('progressCarga').style.display = 'none';
    document.getElementById('resumenCarga').style.display = 'none';
    resultadoValidacionCarga = null;
});

document.getElementById('btnCancelarActualizacion').addEventListener('click', function() {
    document.getElementById('previewActualizacion').style.display = 'none';
    document.getElementById('accionesActualizacion').style.display = 'none';
    document.getElementById('progressActualizacion').style.display = 'none';
    document.getElementById('resumenActualizacion').style.display = 'none';
    resultadoValidacionActualizacion = null;
});

// Error report buttons
document.getElementById('btnReporteErroresCarga').addEventListener('click', function() {
    if (resultadoValidacionCarga) descargarReporteErrores(resultadoValidacionCarga.filasConError, []);
});

document.getElementById('btnReporteErroresActualizacion').addEventListener('click', function() {
    if (resultadoValidacionActualizacion) descargarReporteErrores(resultadoValidacionActualizacion.filasConError, []);
});
