import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * calcularPresupuestoTotal - función pura extraída de mascotas.js
 */
function calcularPresupuestoTotal(valorConsulta, items) {
    const vc = (typeof valorConsulta === 'number' && isFinite(valorConsulta)) ? valorConsulta : 0;
    if (!Array.isArray(items) || items.length === 0) {
        return Math.round(vc * 100) / 100;
    }
    const sumaMedicamentos = items.reduce((acc, item) => {
        const precio = (typeof item.precioVenta === 'number' && isFinite(item.precioVenta)) ? item.precioVenta : 0;
        const cantidad = (typeof item.cantidad === 'number' && isFinite(item.cantidad)) ? item.cantidad : 0;
        return acc + (precio * cantidad);
    }, 0);
    return Math.round((vc + sumaMedicamentos) * 100) / 100;
}

describe('calcularPresupuestoTotal', () => {
    /**
     * Property 1: Cálculo de presupuesto es la suma del valor de consulta más medicamentos
     * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.6
     */
    it('Property 1: presupuesto = valorConsulta + Σ(precioVenta × cantidad), redondeado a 2 decimales', () => {
        fc.assert(
            fc.property(
                fc.float({ min: 0, max: 100000, noNaN: true }),
                fc.array(
                    fc.record({
                        precioVenta: fc.float({ min: 0, max: 50000, noNaN: true }),
                        cantidad: fc.integer({ min: 1, max: 100 })
                    }),
                    { minLength: 0, maxLength: 20 }
                ),
                (valorConsulta, items) => {
                    const resultado = calcularPresupuestoTotal(valorConsulta, items);

                    // Calculate expected
                    const sumaMedicamentos = items.reduce((acc, item) => acc + (item.precioVenta * item.cantidad), 0);
                    const expected = Math.round((valorConsulta + sumaMedicamentos) * 100) / 100;

                    expect(resultado).toBeCloseTo(expected, 2);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('con carrito vacío retorna solo valor consulta', () => {
        expect(calcularPresupuestoTotal(50000, [])).toBe(50000);
    });

    it('con valor consulta 0 y carrito vacío retorna 0', () => {
        expect(calcularPresupuestoTotal(0, [])).toBe(0);
    });

    it('con valor no numérico retorna solo suma de medicamentos', () => {
        const items = [{ precioVenta: 10000, cantidad: 2 }];
        expect(calcularPresupuestoTotal(NaN, items)).toBe(20000);
        expect(calcularPresupuestoTotal(undefined, items)).toBe(20000);
    });
});
