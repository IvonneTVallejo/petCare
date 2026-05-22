import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * crearItemServicioConsulta - función pura extraída de ventas.js
 */
function crearItemServicioConsulta(valorConsulta) {
    return {
        pr_id_producto: null,
        pr_nombre: "Consulta veterinaria",
        pr_precio_venta: valorConsulta,
        pr_costo_compra: 0,
        pr_cantidad_disponible: Infinity,
        pr_stock_minimo: 0,
        cantidad: 1,
        subtotal: valorConsulta,
        esServicio: true
    };
}

describe('crearItemServicioConsulta', () => {
    /**
     * Property 6: Ítem de servicio de consulta se agrega con valor correcto
     * Validates: Requirements 5.2
     */
    it('Property 6: produce un ítem con pr_nombre = "Consulta veterinaria", cantidad = 1, subtotal = valorConsulta, y esServicio = true', () => {
        fc.assert(
            fc.property(
                fc.float({ min: 0, max: 500000, noNaN: true }),
                (valorConsulta) => {
                    const resultado = crearItemServicioConsulta(valorConsulta);

                    expect(resultado.pr_id_producto).toBeNull();
                    expect(resultado.pr_nombre).toBe("Consulta veterinaria");
                    expect(resultado.pr_precio_venta).toBe(valorConsulta);
                    expect(resultado.pr_costo_compra).toBe(0);
                    expect(resultado.cantidad).toBe(1);
                    expect(resultado.subtotal).toBe(valorConsulta);
                    expect(resultado.esServicio).toBe(true);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('con valor 0 retorna ítem con subtotal 0', () => {
        const resultado = crearItemServicioConsulta(0);
        expect(resultado.subtotal).toBe(0);
        expect(resultado.esServicio).toBe(true);
    });
});
