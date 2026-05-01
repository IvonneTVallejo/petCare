// ================= UTILS INVENTARIO =================
// Funciones puras de lógica de negocio extraídas de los módulos del sistema.
// NO contienen efectos secundarios, DOM ni llamadas a Supabase.
// Diseñadas para ser testeadas con Vitest + fast-check.

// ================= INVENTARIO =================

/**
 * Valida que el precio de venta sea mayor o igual al costo de compra.
 * @param {number} costo - Costo de compra del producto.
 * @param {number} precio - Precio de venta del producto.
 * @returns {boolean} true si precio >= costo, false en caso contrario.
 *
 * Validates: Requirements 1.5
 */
export function validarPrecioVenta(costo, precio) {
    if (costo == null || precio == null) return false;
    if (typeof costo !== 'number' || typeof precio !== 'number') return false;
    if (isNaN(costo) || isNaN(precio)) return false;
    return precio >= costo;
}

/**
 * Determina si una categoría de producto requiere fecha de vencimiento.
 * Categorías que la requieren: 1 (Medicamentos), 2 (Alimentos), 4 (Vacunas).
 * @param {number} categoriaId - ID de la categoría del producto.
 * @returns {boolean} true si la categoría requiere fecha de vencimiento.
 *
 * Validates: Requirements 1.3
 */
export function requiereFechaVencimiento(categoriaId) {
    if (categoriaId == null || typeof categoriaId !== 'number') return false;
    const CATEGORIAS_CON_VENCIMIENTO = [1, 2, 4];
    return CATEGORIAS_CON_VENCIMIENTO.includes(categoriaId);
}

/**
 * Filtra un arreglo de productos por categoría.
 * @param {Array<Object>} productos - Lista de productos con propiedad pr_cat_id_categoria.
 * @param {number} categoriaId - ID de la categoría para filtrar.
 * @returns {Array<Object>} Productos que pertenecen a la categoría indicada.
 *
 * Validates: Requirements 2.3, 17.3
 */
export function filtrarPorCategoria(productos, categoriaId) {
    if (!Array.isArray(productos)) return [];
    if (categoriaId == null || typeof categoriaId !== 'number') return [];
    return productos.filter(p => p && p.pr_cat_id_categoria === categoriaId);
}

/**
 * Calcula el nuevo stock después de un movimiento de inventario.
 * @param {number} stockActual - Stock disponible actual.
 * @param {number} cantidad - Cantidad del movimiento (siempre positiva).
 * @param {string} tipoMovimiento - Tipo: 'entrada_compra', 'salida_venta', 'ajuste_positivo', 'ajuste_negativo'.
 * @returns {number|null} Nuevo stock, o null si el resultado sería negativo.
 *
 * Validates: Requirements 3.1, 3.2, 3.3
 */
export function calcularNuevoStock(stockActual, cantidad, tipoMovimiento) {
    if (stockActual == null || cantidad == null || !tipoMovimiento) return null;
    if (typeof stockActual !== 'number' || typeof cantidad !== 'number') return null;
    if (isNaN(stockActual) || isNaN(cantidad)) return null;
    if (cantidad < 0) return null;

    const tiposSuma = ['entrada_compra', 'ajuste_positivo'];
    const tiposResta = ['salida_venta', 'ajuste_negativo'];

    let nuevoStock;

    if (tiposSuma.includes(tipoMovimiento)) {
        nuevoStock = stockActual + cantidad;
    } else if (tiposResta.includes(tipoMovimiento)) {
        nuevoStock = stockActual - cantidad;
    } else {
        return null;
    }

    if (nuevoStock < 0) return null;

    return nuevoStock;
}


/**
 * Filtra movimientos de inventario por rango de fechas y los ordena por fecha descendente.
 * @param {Array<Object>} movimientos - Lista de movimientos con propiedad mi_fecha (string 'YYYY-MM-DD').
 * @param {string} inicio - Fecha de inicio del rango (inclusive), formato 'YYYY-MM-DD'.
 * @param {string} fin - Fecha de fin del rango (inclusive), formato 'YYYY-MM-DD'.
 * @returns {Array<Object>} Movimientos filtrados y ordenados por mi_fecha descendente.
 *
 * Validates: Requirements 4.1, 4.3
 */
export function filtrarMovimientosPorFecha(movimientos, inicio, fin) {
    if (!Array.isArray(movimientos)) return [];
    if (!inicio || !fin) return [];
    if (typeof inicio !== 'string' || typeof fin !== 'string') return [];

    const fechaInicio = new Date(inicio + 'T00:00:00');
    const fechaFin = new Date(fin + 'T00:00:00');

    if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) return [];

    const filtrados = movimientos.filter(m => {
        if (!m || !m.mi_fecha) return false;
        const fechaMov = new Date(m.mi_fecha + 'T00:00:00');
        if (isNaN(fechaMov.getTime())) return false;
        return fechaMov >= fechaInicio && fechaMov <= fechaFin;
    });

    // Ordenar por fecha descendente
    filtrados.sort((a, b) => {
        const fechaA = new Date(a.mi_fecha + 'T00:00:00');
        const fechaB = new Date(b.mi_fecha + 'T00:00:00');
        return fechaB - fechaA;
    });

    return filtrados;
}

/**
 * Clasifica productos con stock bajo (cantidad_disponible <= stock_minimo).
 * @param {Array<Object>} productos - Lista de productos con pr_cantidad_disponible y pr_stock_minimo.
 * @returns {{ productosStockBajo: Array<Object>, count: number }}
 *
 * Validates: Requirements 5.1, 5.2
 */
export function clasificarStockBajo(productos) {
    if (!Array.isArray(productos)) return { productosStockBajo: [], count: 0 };

    const productosStockBajo = productos.filter(p => {
        if (!p || typeof p.pr_cantidad_disponible !== 'number' || typeof p.pr_stock_minimo !== 'number') {
            return false;
        }
        return p.pr_cantidad_disponible <= p.pr_stock_minimo;
    });

    return {
        productosStockBajo,
        count: productosStockBajo.length
    };
}

/**
 * Clasifica el estado de vencimiento de un producto respecto a una fecha de referencia.
 * @param {Object} producto - Producto con propiedad pr_fecha_vencimiento (string 'YYYY-MM-DD' o null).
 * @param {Date|string} hoy - Fecha de referencia (Date object o string 'YYYY-MM-DD').
 * @returns {'vencido'|'proximo'|'vigente'|null} Clasificación del vencimiento, o null si no tiene fecha.
 *
 * Validates: Requirements 6.1, 6.2, 6.3
 */
export function clasificarVencimiento(producto, hoy) {
    if (!producto || !producto.pr_fecha_vencimiento) return null;

    let fechaHoy;
    if (hoy instanceof Date) {
        fechaHoy = new Date(hoy);
    } else if (typeof hoy === 'string') {
        fechaHoy = new Date(hoy + 'T00:00:00');
    } else {
        return null;
    }

    if (isNaN(fechaHoy.getTime())) return null;

    fechaHoy.setHours(0, 0, 0, 0);

    const fechaVenc = new Date(producto.pr_fecha_vencimiento + 'T00:00:00');
    if (isNaN(fechaVenc.getTime())) return null;
    fechaVenc.setHours(0, 0, 0, 0);

    if (fechaVenc < fechaHoy) {
        return 'vencido';
    }

    const en30Dias = new Date(fechaHoy);
    en30Dias.setDate(en30Dias.getDate() + 30);

    if (fechaVenc <= en30Dias) {
        return 'proximo';
    }

    return 'vigente';
}

// ================= PROVEEDORES =================

/**
 * Busca proveedores en una lista por nombre (parcial, case-insensitive) o NIT (coincidencia exacta).
 * @param {Array<Object>} proveedores - Lista de proveedores con prov_nombre y prov_nit.
 * @param {string} termino - Término de búsqueda.
 * @returns {Array<Object>} Proveedores que coinciden con el término.
 *
 * Validates: Requirements 7.4
 */
export function buscarProveedorEnLista(proveedores, termino) {
    if (!Array.isArray(proveedores)) return [];
    if (!termino || typeof termino !== 'string') return [];

    const terminoLower = termino.toLowerCase().trim();
    if (!terminoLower) return [];

    return proveedores.filter(p => {
        if (!p) return false;
        const coincideNombre = p.prov_nombre &&
            typeof p.prov_nombre === 'string' &&
            p.prov_nombre.toLowerCase().includes(terminoLower);
        const coincideNit = p.prov_nit &&
            typeof p.prov_nit === 'string' &&
            p.prov_nit === termino.trim();
        return coincideNombre || coincideNit;
    });
}


// ================= COMPRAS =================

/**
 * Calcula subtotales por línea y el total general de un conjunto de líneas de detalle.
 * Acepta líneas con { cantidad, costoUnitario } o { cantidad, precioUnitario }.
 * @param {Array<Object>} lineas - Lista de líneas con cantidad y costo/precio unitario.
 * @returns {{ lineas: Array<Object>, totalGeneral: number }}
 *
 * Validates: Requirements 8.2, 11.5
 */
export function calcularTotalesLineas(lineas) {
    if (!Array.isArray(lineas)) return { lineas: [], totalGeneral: 0 };

    let totalGeneral = 0;

    const lineasConSubtotal = lineas.map(linea => {
        if (!linea) return { ...linea, subtotal: 0 };

        const cantidad = typeof linea.cantidad === 'number' && !isNaN(linea.cantidad)
            ? linea.cantidad : 0;
        const precioUnitario = typeof linea.costoUnitario === 'number' && !isNaN(linea.costoUnitario)
            ? linea.costoUnitario
            : (typeof linea.precioUnitario === 'number' && !isNaN(linea.precioUnitario)
                ? linea.precioUnitario : 0);

        const subtotal = cantidad * precioUnitario;
        totalGeneral += subtotal;

        return { ...linea, subtotal };
    });

    return {
        lineas: lineasConSubtotal,
        totalGeneral
    };
}

/**
 * Determina el estado de una orden de compra basándose en las cantidades recibidas vs solicitadas.
 * @param {Array<Object>} lineas - Lista de líneas con cantidadSolicitada y cantidadRecibida.
 * @returns {'recibida_completa'|'recibida_parcial'|'pendiente'} Estado resultante de la orden.
 *
 * Validates: Requirements 9.2, 9.3
 */
export function determinarEstadoOrden(lineas) {
    if (!Array.isArray(lineas) || lineas.length === 0) return 'pendiente';

    let todasCompletas = true;
    let algunaRecibida = false;

    for (const linea of lineas) {
        if (!linea) continue;

        const solicitada = typeof linea.cantidadSolicitada === 'number' ? linea.cantidadSolicitada : 0;
        const recibida = typeof linea.cantidadRecibida === 'number' ? linea.cantidadRecibida : 0;

        if (recibida > 0) {
            algunaRecibida = true;
        }

        if (recibida < solicitada) {
            todasCompletas = false;
        }
    }

    if (todasCompletas && algunaRecibida) {
        return 'recibida_completa';
    }

    if (algunaRecibida) {
        return 'recibida_parcial';
    }

    return 'pendiente';
}

// ================= VENTAS =================

/**
 * Valida si una cantidad solicitada para el carrito es válida respecto al stock disponible.
 * @param {number} cantidad - Cantidad deseada.
 * @param {number} stockDisponible - Stock disponible del producto.
 * @returns {{ valido: boolean, cantidadFinal: number }}
 *
 * Validates: Requirements 11.4
 */
export function validarCantidadCarrito(cantidad, stockDisponible) {
    if (typeof cantidad !== 'number' || typeof stockDisponible !== 'number') {
        return { valido: false, cantidadFinal: 0 };
    }
    if (isNaN(cantidad) || isNaN(stockDisponible)) {
        return { valido: false, cantidadFinal: 0 };
    }
    if (cantidad <= 0 || stockDisponible <= 0) {
        return { valido: false, cantidadFinal: 0 };
    }

    if (cantidad > stockDisponible) {
        return { valido: false, cantidadFinal: stockDisponible };
    }

    return { valido: true, cantidadFinal: cantidad };
}

// ================= REPORTES =================

/**
 * Calcula la utilidad bruta a partir de un arreglo de ventas.
 * @param {Array<Object>} ventas - Lista con { cantidadVendida, precioUnitario, costoUnitario }.
 * @returns {{ detalles: Array<Object>, ingresoTotal: number, costoTotal: number, utilidadBruta: number }}
 *
 * Validates: Requirements 16.1, 16.2, 16.3
 */
export function calcularUtilidad(ventas) {
    if (!Array.isArray(ventas)) return { detalles: [], ingresoTotal: 0, costoTotal: 0, utilidadBruta: 0 };

    let ingresoTotal = 0;
    let costoTotal = 0;

    const detalles = ventas.map(v => {
        if (!v) return { ...v, ingreso: 0, costo: 0, utilidad: 0 };

        const cantidadVendida = typeof v.cantidadVendida === 'number' && !isNaN(v.cantidadVendida)
            ? v.cantidadVendida : 0;
        const precioUnitario = typeof v.precioUnitario === 'number' && !isNaN(v.precioUnitario)
            ? v.precioUnitario : 0;
        const costoUnitario = typeof v.costoUnitario === 'number' && !isNaN(v.costoUnitario)
            ? v.costoUnitario : 0;

        const ingreso = precioUnitario * cantidadVendida;
        const costo = costoUnitario * cantidadVendida;
        const utilidad = ingreso - costo;

        ingresoTotal += ingreso;
        costoTotal += costo;

        return { ...v, ingreso, costo, utilidad };
    });

    return {
        detalles,
        ingresoTotal,
        costoTotal,
        utilidadBruta: ingresoTotal - costoTotal
    };
}

/**
 * Calcula el inventario valorizado (valor = cantidadDisponible × costoCompra).
 * @param {Array<Object>} productos - Lista con { cantidadDisponible, costoCompra }.
 * @returns {{ detalles: Array<Object>, valorTotal: number }}
 *
 * Validates: Requirements 17.1, 17.2
 */
export function calcularInventarioValorizado(productos) {
    if (!Array.isArray(productos)) return { detalles: [], valorTotal: 0 };

    let valorTotal = 0;

    const detalles = productos.map(p => {
        if (!p) return { ...p, valor: 0 };

        const cantidadDisponible = typeof p.cantidadDisponible === 'number' && !isNaN(p.cantidadDisponible)
            ? p.cantidadDisponible : 0;
        const costoCompra = typeof p.costoCompra === 'number' && !isNaN(p.costoCompra)
            ? p.costoCompra : 0;

        const valor = cantidadDisponible * costoCompra;
        valorTotal += valor;

        return { ...p, valor };
    });

    return {
        detalles,
        valorTotal
    };
}

/**
 * Valida que la fecha de inicio sea menor o igual a la fecha de fin.
 * @param {string} inicio - Fecha de inicio en formato 'YYYY-MM-DD'.
 * @param {string} fin - Fecha de fin en formato 'YYYY-MM-DD'.
 * @returns {boolean} true si inicio <= fin, false en caso contrario.
 *
 * Validates: Requirements 18.2
 */
export function validarRangoFechas(inicio, fin) {
    if (!inicio || !fin) return false;
    if (typeof inicio !== 'string' || typeof fin !== 'string') return false;

    const fechaInicio = new Date(inicio + 'T00:00:00');
    const fechaFin = new Date(fin + 'T00:00:00');

    if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) return false;

    return fechaInicio <= fechaFin;
}
