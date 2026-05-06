import { describe, it, expect } from 'vitest';
import { eliminarDelCarrito } from '../js/utils-inventario.js';

describe('eliminarDelCarrito', () => {
    const carritoBase = [
        {
            productoId: 1,
            nombre: 'Diarreol',
            lote: 'L001',
            cantidad: 2,
            stockDisponible: 10,
            costoUnitario: 5000
        },
        {
            productoId: 2,
            nombre: 'Ketoprofeno',
            lote: 'L002',
            cantidad: 1,
            stockDisponible: 5,
            costoUnitario: 8000
        },
        {
            productoId: 3,
            nombre: 'Amoxicilina',
            lote: 'L003',
            cantidad: 3,
            stockDisponible: 20,
            costoUnitario: 12000
        }
    ];

    it('elimina el item con el productoId indicado', () => {
        const resultado = eliminarDelCarrito(carritoBase, 2);
        expect(resultado).toHaveLength(2);
        expect(resultado.find(item => item.productoId === 2)).toBeUndefined();
    });

    it('retorna un nuevo array (inmutabilidad)', () => {
        const resultado = eliminarDelCarrito(carritoBase, 1);
        expect(resultado).not.toBe(carritoBase);
        expect(carritoBase).toHaveLength(3);
    });

    it('no muta los items restantes', () => {
        const resultado = eliminarDelCarrito(carritoBase, 1);
        expect(resultado[0]).toEqual(carritoBase[1]);
        expect(resultado[1]).toEqual(carritoBase[2]);
    });

    it('retorna copia del carrito si productoId no existe', () => {
        const resultado = eliminarDelCarrito(carritoBase, 999);
        expect(resultado).toHaveLength(3);
        expect(resultado).not.toBe(carritoBase);
        expect(resultado).toEqual(carritoBase);
    });

    it('retorna array vacío si el carrito tiene un solo item y se elimina', () => {
        const carritoUnico = [{ productoId: 1, nombre: 'Diarreol', lote: 'L001', cantidad: 1, stockDisponible: 10, costoUnitario: 5000 }];
        const resultado = eliminarDelCarrito(carritoUnico, 1);
        expect(resultado).toHaveLength(0);
        expect(resultado).toEqual([]);
    });

    it('retorna array vacío si carrito no es un array', () => {
        expect(eliminarDelCarrito(null, 1)).toEqual([]);
        expect(eliminarDelCarrito(undefined, 1)).toEqual([]);
        expect(eliminarDelCarrito('string', 1)).toEqual([]);
        expect(eliminarDelCarrito(123, 1)).toEqual([]);
    });

    it('retorna copia del carrito si productoId es null o undefined', () => {
        const resultado = eliminarDelCarrito(carritoBase, null);
        expect(resultado).toHaveLength(3);
        expect(resultado).not.toBe(carritoBase);

        const resultado2 = eliminarDelCarrito(carritoBase, undefined);
        expect(resultado2).toHaveLength(3);
        expect(resultado2).not.toBe(carritoBase);
    });

    it('retorna array vacío si carrito está vacío', () => {
        const resultado = eliminarDelCarrito([], 1);
        expect(resultado).toHaveLength(0);
        expect(resultado).toEqual([]);
    });

    it('solo elimina el item con el productoId exacto (no afecta otros)', () => {
        const resultado = eliminarDelCarrito(carritoBase, 3);
        expect(resultado).toHaveLength(2);
        expect(resultado[0].productoId).toBe(1);
        expect(resultado[1].productoId).toBe(2);
    });
});
