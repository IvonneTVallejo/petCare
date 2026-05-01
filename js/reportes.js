// ================= CONFIG =================

const SUPABASE_URL = "https://nlqtzidfowoxylporidi.supabase.co";
const SUPABASE_KEY = "sb_publishable_Qe7khKcVgFoN1KpXydGbcA_mEddQQNi";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// ================= INITIALIZATION =================

document.addEventListener("DOMContentLoaded", () => {
    establecerFechasDefault();
    cargarCategorias();
    inicializarEventos();
});

function establecerFechasDefault() {
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    document.getElementById("fechaInicio").value = primerDiaMes.toISOString().split("T")[0];
    document.getElementById("fechaFin").value = hoy.toISOString().split("T")[0];
}

function inicializarEventos() {
    // Report type selector change — show/hide category filter
    document.getElementById("tipoReporte").addEventListener("change", function () {
        const filtroCategoria = document.getElementById("filtroCategoria");
        if (this.value === "inventario_valorizado") {
            filtroCategoria.style.display = "";
        } else {
            filtroCategoria.style.display = "none";
        }
    });

    // Generate report button
    document.getElementById("btnGenerarReporte").addEventListener("click", generarReporte);

    // Print button
    document.getElementById("btnImprimir").addEventListener("click", function () {
        window.print();
    });
}

// ================= LOAD CATEGORIES =================

async function cargarCategorias() {
    const { data, error } = await supabaseClient
        .from("categoria_producto")
        .select("*")
        .order("cat_id_categoria");

    if (error) return;

    const select = document.getElementById("filtroCategoria");
    select.innerHTML = '<option value="">Todas las categorías</option>';
    (data || []).forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat.cat_id_categoria;
        opt.textContent = cat.cat_nombre;
        select.appendChild(opt);
    });
}

// ================= DATE VALIDATION =================

function validarRangoFechas(inicio, fin) {
    if (!inicio || !fin) {
        Swal.fire({
            title: "Fechas requeridas",
            text: "Por favor seleccione fecha de inicio y fecha de fin.",
            icon: "warning"
        });
        return false;
    }

    if (inicio > fin) {
        Swal.fire({
            title: "Rango inválido",
            text: "La fecha de inicio no puede ser posterior a la fecha de fin.",
            icon: "error"
        });
        return false;
    }

    return true;
}

// ================= MAIN REPORT GENERATOR =================

async function generarReporte() {
    const tipo = document.getElementById("tipoReporte").value;
    const inicio = document.getElementById("fechaInicio").value;
    const fin = document.getElementById("fechaFin").value;

    if (tipo === "inventario_valorizado") {
        const catId = document.getElementById("filtroCategoria").value;
        await reporteInventarioValorizado(catId || null);
        return;
    }

    if (!validarRangoFechas(inicio, fin)) return;

    switch (tipo) {
        case "mas_vendidos":
            await reporteMasVendidos(inicio, fin);
            break;
        case "baja_rotacion":
            await reporteBajaRotacion(inicio, fin);
            break;
        case "utilidad":
            await reporteUtilidad(inicio, fin);
            break;
    }
}

// ================= REPORT: MÁS VENDIDOS =================

async function reporteMasVendidos(inicio, fin) {
    const { data, error } = await supabaseClient
        .from("detalle_venta")
        .select(`
            dv_cantidad,
            dv_subtotal,
            dv_pr_id_producto,
            productos ( pr_nombre, categoria_producto ( cat_nombre ) ),
            ventas!inner ( vt_fecha_venta )
        `)
        .gte("ventas.vt_fecha_venta", inicio)
        .lte("ventas.vt_fecha_venta", fin);

    if (error) {
        await Swal.fire({ title: "Error", text: error.message, icon: "error" });
        return;
    }

    // Group by product
    const agrupado = {};
    (data || []).forEach(d => {
        const id = d.dv_pr_id_producto;
        if (!agrupado[id]) {
            agrupado[id] = {
                nombre: d.productos ? d.productos.pr_nombre : `Producto #${id}`,
                categoria: (d.productos && d.productos.categoria_producto) ? d.productos.categoria_producto.cat_nombre : "-",
                cantidadVendida: 0,
                ingresoTotal: 0
            };
        }
        agrupado[id].cantidadVendida += d.dv_cantidad;
        agrupado[id].ingresoTotal += d.dv_subtotal;
    });

    // Convert to array and sort by quantity DESC
    const productos = Object.values(agrupado).sort((a, b) => b.cantidadVendida - a.cantidadVendida);

    // Calculate grand total for percentage
    const totalVentas = productos.reduce((sum, p) => sum + p.ingresoTotal, 0);

    // Render table
    const thead = document.getElementById("tablaReporteHead");
    thead.innerHTML = `
        <tr>
            <th>Producto</th>
            <th>Categoría</th>
            <th>Cantidad Vendida</th>
            <th>Ingreso Total</th>
            <th>% del Total</th>
        </tr>`;

    const tbody = document.getElementById("tablaReporteBody");
    tbody.innerHTML = "";

    if (productos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay ventas en el período seleccionado</td></tr>';
        return;
    }

    productos.forEach(p => {
        const porcentaje = totalVentas > 0 ? ((p.ingresoTotal / totalVentas) * 100).toFixed(1) : "0.0";
        tbody.innerHTML += `
            <tr class="text-center">
                <td>${p.nombre}</td>
                <td>${p.categoria}</td>
                <td>${p.cantidadVendida}</td>
                <td>$${Number(p.ingresoTotal).toLocaleString("es-CO")}</td>
                <td>${porcentaje}%</td>
            </tr>`;
    });

    // Totals row
    const totalCantidad = productos.reduce((sum, p) => sum + p.cantidadVendida, 0);
    tbody.innerHTML += `
        <tr class="text-center font-weight-bold" style="background-color: #d4edda;">
            <td colspan="2">TOTALES</td>
            <td>${totalCantidad}</td>
            <td>$${Number(totalVentas).toLocaleString("es-CO")}</td>
            <td>100%</td>
        </tr>`;
}

// ================= REPORT: BAJA ROTACIÓN =================

async function reporteBajaRotacion(inicio, fin) {
    // 1. Get all products with category
    const { data: productos, error: errProd } = await supabaseClient
        .from("productos")
        .select(`
            pr_id_producto,
            pr_nombre,
            pr_cantidad_disponible,
            categoria_producto ( cat_nombre )
        `)
        .order("pr_nombre");

    if (errProd) {
        await Swal.fire({ title: "Error", text: errProd.message, icon: "error" });
        return;
    }

    // 2. Get sales movements in the period
    const { data: movimientos, error: errMov } = await supabaseClient
        .from("movimientos_inventario")
        .select(`
            mi_pr_id_producto,
            mi_cantidad,
            mi_fecha,
            tipo_movimiento_inventario!inner ( tmi_tipo )
        `)
        .eq("tipo_movimiento_inventario.tmi_tipo", "salida_venta")
        .gte("mi_fecha", inicio)
        .lte("mi_fecha", fin);

    if (errMov) {
        await Swal.fire({ title: "Error", text: errMov.message, icon: "error" });
        return;
    }

    // 3. Group sales by product
    const ventasPorProducto = {};
    (movimientos || []).forEach(m => {
        const id = m.mi_pr_id_producto;
        if (!ventasPorProducto[id]) {
            ventasPorProducto[id] = { totalVendido: 0, ultimaFecha: null };
        }
        ventasPorProducto[id].totalVendido += m.mi_cantidad;
        if (!ventasPorProducto[id].ultimaFecha || m.mi_fecha > ventasPorProducto[id].ultimaFecha) {
            ventasPorProducto[id].ultimaFecha = m.mi_fecha;
        }
    });

    // 4. Determine low rotation products
    const hoy = new Date();
    const bajaRotacion = [];

    (productos || []).forEach(p => {
        const ventas = ventasPorProducto[p.pr_id_producto];
        const stock = p.pr_cantidad_disponible;
        const umbral = stock * 0.1; // 10% of stock

        let esBajaRotacion = false;
        let ultimaVenta = null;
        let diasSinMovimiento = 0;

        if (!ventas) {
            // No sales at all in the period
            esBajaRotacion = true;
            diasSinMovimiento = Math.floor((hoy - new Date(inicio)) / (1000 * 60 * 60 * 24));
        } else if (ventas.totalVendido < umbral) {
            // Sales below 10% of stock
            esBajaRotacion = true;
            ultimaVenta = ventas.ultimaFecha;
            diasSinMovimiento = Math.floor((hoy - new Date(ventas.ultimaFecha)) / (1000 * 60 * 60 * 24));
        }

        if (esBajaRotacion) {
            bajaRotacion.push({
                nombre: p.pr_nombre,
                categoria: p.categoria_producto ? p.categoria_producto.cat_nombre : "-",
                stock: stock,
                ultimaVenta: ultimaVenta,
                diasSinMovimiento: diasSinMovimiento
            });
        }
    });

    // Render table
    const thead = document.getElementById("tablaReporteHead");
    thead.innerHTML = `
        <tr>
            <th>Producto</th>
            <th>Categoría</th>
            <th>Stock</th>
            <th>Última Venta</th>
            <th>Días sin Movimiento</th>
        </tr>`;

    const tbody = document.getElementById("tablaReporteBody");
    tbody.innerHTML = "";

    if (bajaRotacion.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No se encontraron productos de baja rotación en el período</td></tr>';
        return;
    }

    bajaRotacion.forEach(p => {
        const fechaUltimaVenta = p.ultimaVenta
            ? new Date(p.ultimaVenta).toLocaleDateString("es-CO")
            : "Sin ventas";

        tbody.innerHTML += `
            <tr class="text-center">
                <td>${p.nombre}</td>
                <td>${p.categoria}</td>
                <td>${p.stock}</td>
                <td>${fechaUltimaVenta}</td>
                <td>${p.diasSinMovimiento}</td>
            </tr>`;
    });

    // Summary row
    tbody.innerHTML += `
        <tr class="text-center font-weight-bold" style="background-color: #f8d7da;">
            <td colspan="5">Total productos de baja rotación: ${bajaRotacion.length}</td>
        </tr>`;
}

// ================= REPORT: UTILIDAD =================

async function reporteUtilidad(inicio, fin) {
    const { data, error } = await supabaseClient
        .from("detalle_venta")
        .select(`
            dv_cantidad,
            dv_precio_unitario,
            dv_costo_unitario,
            dv_pr_id_producto,
            productos ( pr_nombre ),
            ventas!inner ( vt_fecha_venta )
        `)
        .gte("ventas.vt_fecha_venta", inicio)
        .lte("ventas.vt_fecha_venta", fin);

    if (error) {
        await Swal.fire({ title: "Error", text: error.message, icon: "error" });
        return;
    }

    // Group by product
    const agrupado = {};
    (data || []).forEach(d => {
        const id = d.dv_pr_id_producto;
        if (!agrupado[id]) {
            agrupado[id] = {
                nombre: d.productos ? d.productos.pr_nombre : `Producto #${id}`,
                cantidadVendida: 0,
                ingreso: 0,
                costo: 0
            };
        }
        agrupado[id].cantidadVendida += d.dv_cantidad;
        agrupado[id].ingreso += d.dv_precio_unitario * d.dv_cantidad;
        agrupado[id].costo += d.dv_costo_unitario * d.dv_cantidad;
    });

    const productos = Object.values(agrupado).sort((a, b) => (b.ingreso - b.costo) - (a.ingreso - a.costo));

    // Render table
    const thead = document.getElementById("tablaReporteHead");
    thead.innerHTML = `
        <tr>
            <th>Producto</th>
            <th>Cantidad Vendida</th>
            <th>Ingreso</th>
            <th>Costo</th>
            <th>Utilidad</th>
        </tr>`;

    const tbody = document.getElementById("tablaReporteBody");
    tbody.innerHTML = "";

    if (productos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay ventas en el período seleccionado</td></tr>';
        return;
    }

    let ingresoTotal = 0;
    let costoTotal = 0;

    productos.forEach(p => {
        const utilidad = p.ingreso - p.costo;
        ingresoTotal += p.ingreso;
        costoTotal += p.costo;

        tbody.innerHTML += `
            <tr class="text-center">
                <td>${p.nombre}</td>
                <td>${p.cantidadVendida}</td>
                <td>$${Number(p.ingreso).toLocaleString("es-CO")}</td>
                <td>$${Number(p.costo).toLocaleString("es-CO")}</td>
                <td>$${Number(utilidad).toLocaleString("es-CO")}</td>
            </tr>`;
    });

    // Summary row
    const utilidadBruta = ingresoTotal - costoTotal;
    tbody.innerHTML += `
        <tr class="text-center font-weight-bold" style="background-color: #d4edda;">
            <td colspan="2">TOTALES</td>
            <td>$${Number(ingresoTotal).toLocaleString("es-CO")}</td>
            <td>$${Number(costoTotal).toLocaleString("es-CO")}</td>
            <td>$${Number(utilidadBruta).toLocaleString("es-CO")}</td>
        </tr>`;
}

// ================= REPORT: INVENTARIO VALORIZADO =================

async function reporteInventarioValorizado(catId) {
    let query = supabaseClient
        .from("productos")
        .select(`
            pr_id_producto,
            pr_nombre,
            pr_cantidad_disponible,
            pr_costo_compra,
            categoria_producto ( cat_nombre )
        `)
        .order("pr_nombre");

    if (catId) {
        query = query.eq("pr_cat_id_categoria", parseInt(catId));
    }

    const { data, error } = await query;

    if (error) {
        await Swal.fire({ title: "Error", text: error.message, icon: "error" });
        return;
    }

    // Render table
    const thead = document.getElementById("tablaReporteHead");
    thead.innerHTML = `
        <tr>
            <th>Producto</th>
            <th>Categoría</th>
            <th>Stock</th>
            <th>Costo Unitario</th>
            <th>Valor Total</th>
        </tr>`;

    const tbody = document.getElementById("tablaReporteBody");
    tbody.innerHTML = "";

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay productos para mostrar</td></tr>';
        return;
    }

    let valorTotalInventario = 0;

    data.forEach(p => {
        const valor = p.pr_cantidad_disponible * p.pr_costo_compra;
        valorTotalInventario += valor;

        tbody.innerHTML += `
            <tr class="text-center">
                <td>${p.pr_nombre}</td>
                <td>${p.categoria_producto ? p.categoria_producto.cat_nombre : "-"}</td>
                <td>${p.pr_cantidad_disponible}</td>
                <td>$${Number(p.pr_costo_compra).toLocaleString("es-CO")}</td>
                <td>$${Number(valor).toLocaleString("es-CO")}</td>
            </tr>`;
    });

    // Total row
    tbody.innerHTML += `
        <tr class="text-center font-weight-bold" style="background-color: #d4edda;">
            <td colspan="4">VALOR TOTAL INVENTARIO</td>
            <td>$${Number(valorTotalInventario).toLocaleString("es-CO")}</td>
        </tr>`;
}
