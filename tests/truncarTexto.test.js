import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { truncarTexto } from '../js/utils-mascotas.js';

/**
 * **Validates: Requirements 3.2**
 * Propiedad 3: Truncado de texto de seguimiento
 */
describe('truncarTexto - Property-Based Tests', () => {

    it('retorna string idéntico al original si longitud <= max', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 0, maxLength: 50 }),
                (texto) => {
                    const resultado = truncarTexto(texto, 50);
                    expect(resultado).toBe(texto);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('retorna string truncado a max + "..." si longitud > max', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 51, maxLength: 500 }),
                (texto) => {
                    const resultado = truncarTexto(texto, 50);
                    expect(resultado.length).toBe(53); // 50 + "..."
                    expect(resultado).toBe(texto.substring(0, 50) + '...');
                }
            ),
            { numRuns: 100 }
        );
    });

    it('resultado siempre tiene longitud <= max + 3', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1, maxLength: 1000 }),
                fc.integer({ min: 1, max: 200 }),
                (texto, max) => {
                    const resultado = truncarTexto(texto, max);
                    expect(resultado.length).toBeLessThanOrEqual(max + 3);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('retorna string vacío para inputs no-string o vacíos', () => {
        fc.assert(
            fc.property(
                fc.constantFrom(null, undefined, '', 0, false),
                (texto) => {
                    const resultado = truncarTexto(texto, 50);
                    expect(resultado).toBe('');
                }
            ),
            { numRuns: 100 }
        );
    });
});
