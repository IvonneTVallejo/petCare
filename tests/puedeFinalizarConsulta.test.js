import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { puedeFinalizarConsulta } from '../js/utils-mascotas.js';

/**
 * **Validates: Requirements 6.7**
 * Propiedad 7: Rechazo de finalización de consulta ya finalizada
 */
describe('puedeFinalizarConsulta - Property-Based Tests', () => {

    it('retorna true solo cuando estadoActual === 1', () => {
        expect(puedeFinalizarConsulta(1)).toBe(true);
    });

    it('retorna false cuando estadoActual === 2 (Finalizada)', () => {
        expect(puedeFinalizarConsulta(2)).toBe(false);
    });

    it('retorna false para cualquier estado diferente de 1', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 2, max: 1000 }),
                (estado) => {
                    expect(puedeFinalizarConsulta(estado)).toBe(false);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('retorna false para valores no numéricos', () => {
        fc.assert(
            fc.property(
                fc.oneof(
                    fc.string(),
                    fc.boolean(),
                    fc.constant(null),
                    fc.constant(undefined)
                ),
                (estado) => {
                    expect(puedeFinalizarConsulta(estado)).toBe(false);
                }
            ),
            { numRuns: 100 }
        );
    });
});
