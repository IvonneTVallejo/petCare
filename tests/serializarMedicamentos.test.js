import { describe, it, expect } from 'vitest';
import {
    serializarMedicamentosConsulta,
    deserializarMedicamentosConsulta
} from '../js/utils-inventario.js';

describe('serializarMedicamentosConsulta', () => {
    it('serializa una lista de medicamentos a JSON string', () => {
        const items = [
            { nombre: 'Diarreol', lote: 'L001', cantidad: 2 },
            { nombre: 'Ketoprofeno', lote: 'L045', cantidad: 1 }
        ];
        const resultado = serializarMedicamentosConsulta(items);
        const parsed = JSON.parse(resultado);
        expect(parsed).toEqual(items);
    });

    it('solo incluye nombre, lote y cantidad (strip otros campos)', () => {
        const items = [
            { nombre: 'Diarreol', lote: 'L001', cantidad: 2, productoId: 5, stockDisponible: 10, costoUnitario: 5000 }
        ];
        const resultado = serializarMedicamentosConsulta(items);
        const parsed = JSON.parse(resultado);
        expect(parsed[0]).toEqual({ nombre: 'Diarreol', lote: 'L001', cantidad: 2 });
        expect(parsed[0].productoId).toBeUndefined();
        expect(parsed[0].stockDisponible).toBeUndefined();
        expect(parsed[0].costoUnitario).toBeUndefined();
    });

    it('retorna "[]" para array vacío', () => {
        expect(serializarMedicamentosConsulta([])).toBe('[]');
    });

    it('retorna "[]" para null o undefined', () => {
        expect(serializarMedicamentosConsulta(null)).toBe('[]');
        expect(serializarMedicamentosConsulta(undefined)).toBe('[]');
    });

    it('retorna "[]" para input no-array', () => {
        expect(serializarMedicamentosConsulta('string')).toBe('[]');
        expect(serializarMedicamentosConsulta(123)).toBe('[]');
        expect(serializarMedicamentosConsulta({})).toBe('[]');
    });

    it('maneja items con campos faltantes usando defaults', () => {
        const items = [{ nombre: 'Diarreol' }];
        const resultado = serializarMedicamentosConsulta(items);
        const parsed = JSON.parse(resultado);
        expect(parsed[0]).toEqual({ nombre: 'Diarreol', lote: '', cantidad: 0 });
    });
});

describe('deserializarMedicamentosConsulta', () => {
    it('deserializa JSON válido a lista de medicamentos', () => {
        const json = '[{"nombre":"Diarreol","lote":"L001","cantidad":2}]';
        const resultado = deserializarMedicamentosConsulta(json);
        expect(resultado).toEqual([{ nombre: 'Diarreol', lote: 'L001', cantidad: 2 }]);
    });

    it('deserializa JSON con múltiples items', () => {
        const json = JSON.stringify([
            { nombre: 'Diarreol', lote: 'L001', cantidad: 2 },
            { nombre: 'Ketoprofeno', lote: 'L045', cantidad: 1 }
        ]);
        const resultado = deserializarMedicamentosConsulta(json);
        expect(resultado).toHaveLength(2);
        expect(resultado[0].nombre).toBe('Diarreol');
        expect(resultado[1].nombre).toBe('Ketoprofeno');
    });

    it('retorna [{texto}] para texto legacy (no JSON)', () => {
        const legacy = 'Diarreol 2 tabletas, Ketoprofeno 1 ampolla';
        const resultado = deserializarMedicamentosConsulta(legacy);
        expect(resultado).toEqual([{ texto: legacy }]);
    });

    it('retorna array vacío para null', () => {
        expect(deserializarMedicamentosConsulta(null)).toEqual([]);
    });

    it('retorna array vacío para undefined', () => {
        expect(deserializarMedicamentosConsulta(undefined)).toEqual([]);
    });

    it('retorna array vacío para string vacío', () => {
        expect(deserializarMedicamentosConsulta('')).toEqual([]);
    });

    it('retorna array vacío para string con solo espacios', () => {
        expect(deserializarMedicamentosConsulta('   ')).toEqual([]);
    });

    it('retorna array vacío para input no-string', () => {
        expect(deserializarMedicamentosConsulta(123)).toEqual([]);
        expect(deserializarMedicamentosConsulta({})).toEqual([]);
        expect(deserializarMedicamentosConsulta([])).toEqual([]);
    });

    it('maneja JSON válido que no es array como legacy', () => {
        const json = '{"nombre":"Diarreol"}';
        const resultado = deserializarMedicamentosConsulta(json);
        expect(resultado).toEqual([{ texto: json }]);
    });

    it('round-trip: serializar y deserializar produce resultado equivalente', () => {
        const items = [
            { nombre: 'Diarreol', lote: 'L001', cantidad: 2 },
            { nombre: 'Ketoprofeno', lote: 'L045', cantidad: 1 }
        ];
        const serializado = serializarMedicamentosConsulta(items);
        const deserializado = deserializarMedicamentosConsulta(serializado);
        expect(deserializado).toEqual(items);
    });

    it('maneja JSON con campos extra (solo extrae nombre, lote, cantidad)', () => {
        const json = '[{"nombre":"Diarreol","lote":"L001","cantidad":2,"extra":"campo"}]';
        const resultado = deserializarMedicamentosConsulta(json);
        expect(resultado[0]).toEqual({ nombre: 'Diarreol', lote: 'L001', cantidad: 2 });
        expect(resultado[0].extra).toBeUndefined();
    });
});
