import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * preordenDetallesACarrito - función pura extraída de ventas.js
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

describe('preordenDetallesACarrito', () => {
    /**
     * Property 5: Transformación de pre-orden a carrito preserva todos los ítems
     * Validates: Requirements 5.1
     */
    it('Property 5: produce un array de la misma longitud donde cada ítem tiene la cantidad y precio unitario correspondiente', () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        pd_pr_id_producto: fc.integer({ min: 1, max: 100000 }),
                        pd_cantidad: fc.integer({ min: 1, max: 100 }),
                        pd_precio_unitario: fc.float({ min: 0, max: 50000, noNaN: true }),
                        productos: fc.record({
                            pr_nombre: fc.string({ minLength: 1, maxLength: 50 }),
                            pr_costo_compra: fc.float({ min: 0, max: 50000, noNaN: true }),
                            pr_cantidad_disponible: fc.integer({ min: 0, max: 10000 }),
                            pr_stock_minimo: fc.integer({ min: 0, max: 100 })
                        })
                    }),
                    { minLength: 0, maxLength: 20 }
                ),
                (detalles) => {
                    const resultado = preordenDetallesACarrito(detalles);

                    // Same length
                    expect(resultado.length).toBe(detalles.length);

                    // Each item preserves quantity and price
                    resultado.forEach((item, i) => {
                        expect(item.pr_id_producto).toBe(detalles[i].pd_pr_id_producto);
                        expect(item.cantidad).toBe(detalles[i].pd_cantidad);
                        expect(item.pr_precio_venta).toBeCloseTo(detalles[i].pd_precio_unitario, 2);
                        expect(item.esServicio).toBe(false);
                    });
                }
            ),
            { numRuns: 100 }
        );
    });

    it('con array vacío retorna array vacío', () => {
        expect(preordenDetallesACarrito([])).toEqual([]);
    });
});
