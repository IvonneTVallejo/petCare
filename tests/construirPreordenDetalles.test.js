import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * construirPreordenDetalles - función pura extraída de mascotas.js
 */
function construirPreordenDetalles(idPreorden, items) {
    if (!Array.isArray(items) || items.length === 0) return [];
    return items.map(item => ({
        pd_po_id_preorden: idPreorden,
        pd_pr_id_producto: item.productoId,
        pd_cantidad: item.cantidad,
        pd_precio_unitario: item.precioVenta || 0,
        pd_subtotal: (item.precioVenta || 0) * item.cantidad
    }));
}

describe('construirPreordenDetalles', () => {
    /**
     * Property 3: Construcción de detalles de pre-orden con subtotales correctos
     * Validates: Requirements 3.2
     */
    it('Property 3: cada detalle tiene pd_subtotal = pd_precio_unitario × pd_cantidad, y la cantidad de detalles es igual a la cantidad de items', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 100000 }),
                fc.array(
                    fc.record({
                        productoId: fc.integer({ min: 1, max: 100000 }),
                        cantidad: fc.integer({ min: 1, max: 100 }),
                        precioVenta: fc.float({ min: 0, max: 50000, noNaN: true })
                    }),
                    { minLength: 1, maxLength: 20 }
                ),
                (idPreorden, items) => {
                    const resultado = construirPreordenDetalles(idPreorden, items);

                    // Same length
                    expect(resultado.length).toBe(items.length);

                    // Each detail has correct subtotal
                    resultado.forEach((detalle, i) => {
                        expect(detalle.pd_po_id_preorden).toBe(idPreorden);
                        expect(detalle.pd_pr_id_producto).toBe(items[i].productoId);
                        expect(detalle.pd_cantidad).toBe(items[i].cantidad);
                        expect(detalle.pd_precio_unitario).toBe(items[i].precioVenta);
                        expect(detalle.pd_subtotal).toBeCloseTo(items[i].precioVenta * items[i].cantidad, 2);
                    });
                }
            ),
            { numRuns: 100 }
        );
    });

    it('con array vacío retorna array vacío', () => {
        expect(construirPreordenDetalles(1, [])).toEqual([]);
    });
});
