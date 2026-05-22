import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * construirPreordenConsulta - función pura extraída de mascotas.js
 */
function construirPreordenConsulta(idConsulta, idMascota, idCliente, valorConsulta, total) {
    return {
        po_cm_id_consulta: idConsulta,
        po_dm_id_mascota: idMascota,
        po_dc_id_cliente: idCliente,
        po_valor_consulta: valorConsulta,
        po_total: total,
        po_estado: "pendiente",
        po_fecha_creacion: new Date().toLocaleString("sv-SE", { timeZone: "America/Bogota" })
    };
}

describe('construirPreordenConsulta', () => {
    /**
     * Property 2: Construcción de cabecera de pre-orden preserva todos los campos requeridos
     * Validates: Requirements 3.1
     */
    it('Property 2: objeto construido contiene todos los campos requeridos con valores correctos y po_estado = "pendiente"', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 100000 }),
                fc.integer({ min: 1, max: 100000 }),
                fc.integer({ min: 1, max: 100000 }),
                fc.float({ min: 0, max: 100000, noNaN: true }),
                fc.float({ min: 0, max: 200000, noNaN: true }),
                (idConsulta, idMascota, idCliente, valorConsulta, total) => {
                    const resultado = construirPreordenConsulta(idConsulta, idMascota, idCliente, valorConsulta, total);

                    expect(resultado.po_cm_id_consulta).toBe(idConsulta);
                    expect(resultado.po_dm_id_mascota).toBe(idMascota);
                    expect(resultado.po_dc_id_cliente).toBe(idCliente);
                    expect(resultado.po_valor_consulta).toBe(valorConsulta);
                    expect(resultado.po_total).toBe(total);
                    expect(resultado.po_estado).toBe("pendiente");
                    expect(resultado.po_fecha_creacion).toBeDefined();
                    expect(typeof resultado.po_fecha_creacion).toBe("string");
                    expect(resultado.po_fecha_creacion.length).toBeGreaterThan(0);
                }
            ),
            { numRuns: 100 }
        );
    });
});
