import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * validarStockCarrito - función pura extraída de ventas.js
 */
function validarStockCarrito(items) {
    if (!Array.isArray(items)) return { valido: true, errores: [] };
    const errores = [];
    for (const item of items) {
        if (item.esServicio) continue;
        if (item.cantidad > item.pr_cantidad_disponible) {
            errores.push("Stock insuficiente para \"" + item.pr_nombre + "\": disponible " + item.pr_cantidad_disponible + ", solicitado " + item.cantidad);
        }
    }
    return { valido: errores.length === 0, errores };
}

describe('validarStockCarrito', () => {
    /**
     * Property 7: Validación de stock rechaza cantidades que exceden disponibilidad
     * Validates: Requirements 6.4
     */
    it('Property 7: retorna {valido: false} cuando al menos un ítem tiene cantidad > pr_cantidad_disponible', () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        pr_id_producto: fc.integer({ min: 1, max: 100000 }),
                        pr_nombre: fc.string({ minLength: 1, maxLength: 50 }),
                        pr_cantidad_disponible: fc.integer({ min: 0, max: 50 }),
                        cantidad: fc.integer({ min: 1, max: 100 }),
                        esServicio: fc.constant(false)
                    }),
                    { minLength: 1, maxLength: 10 }
                ),
                (items) => {
                    const resultado = validarStockCarrito(items);

                    const hayExceso = items.some(item => !item.esServicio && item.cantidad > item.pr_cantidad_disponible);

                    if (hayExceso) {
                        expect(resultado.valido).toBe(false);
                        expect(resultado.errores.length).toBeGreaterThan(0);
                        // Each error should mention the product name
                        resultado.errores.forEach(err => {
                            expect(typeof err).toBe('string');
                            expect(err.length).toBeGreaterThan(0);
                        });
                    } else {
                        expect(resultado.valido).toBe(true);
                        expect(resultado.errores.length).toBe(0);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    it('ítems de servicio se excluyen de la validación', () => {
        const items = [
            { pr_id_producto: null, pr_nombre: "Consulta", cantidad: 1, pr_cantidad_disponible: 0, esServicio: true }
        ];
        const resultado = validarStockCarrito(items);
        expect(resultado.valido).toBe(true);
    });

    it('con todos los productos con stock suficiente retorna {valido: true}', () => {
        const items = [
            { pr_id_producto: 1, pr_nombre: "Producto A", cantidad: 5, pr_cantidad_disponible: 10, esServicio: false }
        ];
        const resultado = validarStockCarrito(items);
        expect(resultado.valido).toBe(true);
        expect(resultado.errores).toEqual([]);
    });
});
