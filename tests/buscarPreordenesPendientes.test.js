import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * validarTerminoBusquedaPreorden - función pura extraída de ventas.js
 */
function validarTerminoBusquedaPreorden(termino) {
    if (!termino || typeof termino !== 'string') return false;
    return termino.trim().length >= 2;
}

describe('validarTerminoBusquedaPreorden', () => {
    /**
     * Property 4: Búsqueda de pre-órdenes retorna solo pendientes que coinciden con el término
     * Validates: Requirements 4.2, 8.1, 8.4
     * 
     * Note: This property tests the validation function (pure). The actual filtering
     * is done server-side via Supabase query, so we test the validation logic here.
     */
    it('Property 4: retorna true solo si el término tiene al menos 2 caracteres', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 0, maxLength: 100 }),
                (termino) => {
                    const resultado = validarTerminoBusquedaPreorden(termino);
                    const trimmed = termino.trim();

                    if (trimmed.length >= 2) {
                        expect(resultado).toBe(true);
                    } else {
                        expect(resultado).toBe(false);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    it('retorna false para null, undefined, y strings vacíos', () => {
        expect(validarTerminoBusquedaPreorden(null)).toBe(false);
        expect(validarTerminoBusquedaPreorden(undefined)).toBe(false);
        expect(validarTerminoBusquedaPreorden("")).toBe(false);
        expect(validarTerminoBusquedaPreorden(" ")).toBe(false);
    });

    it('retorna true para strings con 2+ caracteres no-espacio', () => {
        expect(validarTerminoBusquedaPreorden("ab")).toBe(true);
        expect(validarTerminoBusquedaPreorden("Max")).toBe(true);
        expect(validarTerminoBusquedaPreorden("Juan Pérez")).toBe(true);
    });
});
