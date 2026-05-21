import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validarTextoSeguimiento } from '../js/utils-mascotas.js';

/**
 * **Validates: Requirements 4.8**
 * Propiedad 5: Validación de texto de seguimiento requerido
 */
describe('validarTextoSeguimiento - Property-Based Tests', () => {

    it('retorna valido=false para strings vacíos o solo whitespace', () => {
        fc.assert(
            fc.property(
                fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 0, maxLength: 50 }),
                (texto) => {
                    const resultado = validarTextoSeguimiento(texto);
                    expect(resultado.valido).toBe(false);
                    expect(resultado.error).not.toBeNull();
                }
            ),
            { numRuns: 100 }
        );
    });

    it('retorna valido=true para strings con al menos un carácter no-whitespace', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
                (texto) => {
                    const resultado = validarTextoSeguimiento(texto);
                    expect(resultado.valido).toBe(true);
                    expect(resultado.error).toBeNull();
                }
            ),
            { numRuns: 100 }
        );
    });

    it('retorna valido=false para null y undefined', () => {
        expect(validarTextoSeguimiento(null).valido).toBe(false);
        expect(validarTextoSeguimiento(undefined).valido).toBe(false);
    });

    it('retorna valido=false para tipos no-string', () => {
        fc.assert(
            fc.property(
                fc.oneof(fc.integer(), fc.boolean(), fc.constant(null), fc.constant(undefined)),
                (texto) => {
                    const resultado = validarTextoSeguimiento(texto);
                    expect(resultado.valido).toBe(false);
                }
            ),
            { numRuns: 100 }
        );
    });
});
