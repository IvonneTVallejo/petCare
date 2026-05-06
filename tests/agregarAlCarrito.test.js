import { describe, it, expect } from 'vitest';
import { agregarAlCarrito } from '../js/utils-inventario.js';

describe('agregarAlCarrito', () => {
    const productoBase = {
        pr_id_producto: 1,
        pr_nombre: 'Diarreol',
        pr_lote: 'L001',
        pr_cantidad_disponible: 10,
        pr_costo_compra: 5000
    };

    const productoB = {
        pr_id_producto: 2,
        pr_nombre: 'Ketoprofeno',
        pr_lote: 'L002',
        pr_cantidad_disponible: 5,
        pr_costo_compra: 8000
    };

    it('agrega un producto nuevo al carrito vacío con cantidad 1', () => {
        const resultado = agregarAlCarrito([], productoBase);
        expect(resultado).toHaveLength(1);
        expect(resultado[0]).toEqual({
            productoId: 1,
            nombre: 'Diarreol',
            lote: 'L001',
            cantidad: 1,
            stockDisponible: 10,
            costoUnitario: 5000
        });
    });

    it('agrega un producto nuevo a un carrito con items existentes', () => {
        const carritoInicial = [{
            productoId: 1,
            nombre: 'Diarreol',
            lote: 'L001',
            cantidad: 2,
            stockDisponible: 10,
            costoUnitario: 5000
        }];
        const resultado = agregarAlCarrito(carritoInicial, productoB);
        expect(resultado).toHaveLength(2);
        expect(resultado[1]).toEqual({
            productoId: 2,
            nombre: 'Ketoprofeno',
            lote: 'L002',
            cantidad: 1,
            stockDisponible: 5,
            costoUnitario: 8000
        });
    });

    it('incrementa la cantidad en 1 si el producto ya existe en el carrito', () => {
        const carritoInicial = [{
            productoId: 1,
            nombre: 'Diarreol',
            lote: 'L001',
            cantidad: 3,
            stockDisponible: 10,
            costoUnitario: 5000
        }];
        const resultado = agregarAlCarrito(carritoInicial, productoBase);
        expect(resultado).toHaveLength(1);
        expect(resultado[0].cantidad).toBe(4);
    });

    it('retorna un nuevo array (inmutabilidad)', () => {
        const carritoInicial = [{
            productoId: 1,
            nombre: 'Diarreol',
            lote: 'L001',
            cantidad: 1,
            stockDisponible: 10,
            costoUnitario: 5000
        }];
        const resultado = agregarAlCarrito(carritoInicial, productoB);
        expect(resultado).not.toBe(carritoInicial);
        // El item original no debe haber sido mutado
        expect(carritoInicial[0].cantidad).toBe(1);
    });

    it('no muta los items existentes al incrementar cantidad', () => {
        const itemOriginal = {
            productoId: 1,
            nombre: 'Diarreol',
            lote: 'L001',
            cantidad: 2,
            stockDisponible: 10,
            costoUnitario: 5000
        };
        const carritoInicial = [itemOriginal];
        agregarAlCarrito(carritoInicial, productoBase);
        expect(itemOriginal.cantidad).toBe(2);
    });

    it('retorna array vacío si carrito no es un array', () => {
        expect(agregarAlCarrito(null, productoBase)).toEqual([]);
        expect(agregarAlCarrito(undefined, productoBase)).toEqual([]);
        expect(agregarAlCarrito('string', productoBase)).toEqual([]);
    });

    it('retorna copia del carrito si producto es null o undefined', () => {
        const carritoInicial = [{
            productoId: 1,
            nombre: 'Diarreol',
            lote: 'L001',
            cantidad: 1,
            stockDisponible: 10,
            costoUnitario: 5000
        }];
        const resultado = agregarAlCarrito(carritoInicial, null);
        expect(resultado).toHaveLength(1);
        expect(resultado).not.toBe(carritoInicial);
    });

    it('retorna copia del carrito si producto no tiene pr_id_producto', () => {
        const carritoInicial = [{
            productoId: 1,
            nombre: 'Diarreol',
            lote: 'L001',
            cantidad: 1,
            stockDisponible: 10,
            costoUnitario: 5000
        }];
        const resultado = agregarAlCarrito(carritoInicial, { pr_nombre: 'Sin ID' });
        expect(resultado).toHaveLength(1);
        expect(resultado).not.toBe(carritoInicial);
    });

    it('mapea correctamente los campos del producto al item del carrito', () => {
        const producto = {
            pr_id_producto: 99,
            pr_nombre: 'Amoxicilina',
            pr_lote: 'LOTE-X',
            pr_cantidad_disponible: 25,
            pr_costo_compra: 12500
        };
        const resultado = agregarAlCarrito([], producto);
        expect(resultado[0]).toEqual({
            productoId: 99,
            nombre: 'Amoxicilina',
            lote: 'LOTE-X',
            cantidad: 1,
            stockDisponible: 25,
            costoUnitario: 12500
        });
    });

    it('usa valores por defecto para campos faltantes del producto', () => {
        const productoMinimo = { pr_id_producto: 5 };
        const resultado = agregarAlCarrito([], productoMinimo);
        expect(resultado[0]).toEqual({
            productoId: 5,
            nombre: '',
            lote: '',
            cantidad: 1,
            stockDisponible: 0,
            costoUnitario: 0
        });
    });
});
