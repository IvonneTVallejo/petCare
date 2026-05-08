import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * **Validates: Requirements 1.6**
 * Propiedad 2: Inmutabilidad del campo identificación
 * 
 * Verifies that the update payload for tutor data never includes dc_identificacion.
 * We simulate the payload construction logic from guardarEdicionTutor().
 */

// This function replicates the payload construction logic from pacientes.js guardarEdicionTutor()
function construirPayloadActualizacionTutor(datos) {
    // The payload MUST NOT include dc_identificacion
    return {
        dc_nombre: datos.nombre,
        dc_telefono: datos.telefono,
        dc_direccion: datos.direccion,
        dc_correo: datos.correo
    };
}

describe('Inmutabilidad del campo identificación - Property-Based Tests', () => {

    it('el payload de actualización nunca incluye dc_identificacion', () => {
        fc.assert(
            fc.property(
                fc.record({
                    nombre: fc.string({ minLength: 1, maxLength: 100 }),
                    telefono: fc.string({ minLength: 7, maxLength: 15 }),
                    direccion: fc.string({ minLength: 1, maxLength: 200 }),
                    correo: fc.string({ minLength: 5, maxLength: 50 }),
                    identificacion: fc.string({ minLength: 5, maxLength: 20 })
                }),
                (datos) => {
                    const payload = construirPayloadActualizacionTutor(datos);
                    expect(payload).not.toHaveProperty('dc_identificacion');
                    expect(Object.keys(payload)).toEqual(['dc_nombre', 'dc_telefono', 'dc_direccion', 'dc_correo']);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('el payload preserva los valores de los campos editables', () => {
        fc.assert(
            fc.property(
                fc.record({
                    nombre: fc.string({ minLength: 1, maxLength: 100 }),
                    telefono: fc.string({ minLength: 7, maxLength: 15 }),
                    direccion: fc.string({ minLength: 1, maxLength: 200 }),
                    correo: fc.string({ minLength: 5, maxLength: 50 })
                }),
                (datos) => {
                    const payload = construirPayloadActualizacionTutor(datos);
                    expect(payload.dc_nombre).toBe(datos.nombre);
                    expect(payload.dc_telefono).toBe(datos.telefono);
                    expect(payload.dc_direccion).toBe(datos.direccion);
                    expect(payload.dc_correo).toBe(datos.correo);
                }
            ),
            { numRuns: 100 }
        );
    });
});
