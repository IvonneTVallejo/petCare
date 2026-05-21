import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { renderBotonFinalizar } from '../js/utils-mascotas.js';

/**
 * **Validates: Requirements 6.1, 6.2**
 * Propiedad 6: Visibilidad del botón finalizar según estado
 */
describe('renderBotonFinalizar - Property-Based Tests', () => {

    it('incluye botón "Finalizar" cuando cm_ec_id_estado === 1', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 10000 }),
                (consultaId) => {
                    const consulta = { cm_id_consulta: consultaId, cm_ec_id_estado: 1 };
                    const html = renderBotonFinalizar(consulta);
                    expect(html).toContain('btn-finalizar-consulta');
                    expect(html).toContain(`data-id="${consultaId}"`);
                    expect(html).toContain('🔒');
                }
            ),
            { numRuns: 100 }
        );
    });

    it('no incluye botón cuando cm_ec_id_estado === 2', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 10000 }),
                (consultaId) => {
                    const consulta = { cm_id_consulta: consultaId, cm_ec_id_estado: 2 };
                    const html = renderBotonFinalizar(consulta);
                    expect(html).toBe('');
                    expect(html).not.toContain('btn-finalizar-consulta');
                }
            ),
            { numRuns: 100 }
        );
    });

    it('no incluye botón para cualquier estado diferente de 1', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 10000 }),
                fc.integer({ min: 2, max: 100 }),
                (consultaId, estado) => {
                    const consulta = { cm_id_consulta: consultaId, cm_ec_id_estado: estado };
                    const html = renderBotonFinalizar(consulta);
                    expect(html).toBe('');
                }
            ),
            { numRuns: 100 }
        );
    });
});
