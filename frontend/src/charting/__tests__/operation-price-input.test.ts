import { describe, expect, it } from 'vitest';
import {
  PRICE_ERROR_NOT_NUMBER,
  PRICE_ERROR_ZERO_RISK,
  parsePriceInput,
  roundToDecimals,
  validateOperationPrices,
} from '../operation-price-input';

describe('parsePriceInput (RF-410)', () => {
  it('interpreta el separador decimal de punto', () => {
    expect(parsePriceInput('1.10000')).toBe(1.1);
  });

  it('interpreta el separador decimal local de coma', () => {
    expect(parsePriceInput('1,10000')).toBe(1.1);
  });

  it('ignora los espacios alrededor del valor', () => {
    expect(parsePriceInput('  1.095  ')).toBe(1.095);
  });

  it('acepta un entero y un valor negativo', () => {
    expect(parsePriceInput('1')).toBe(1);
    expect(parsePriceInput('-0.5')).toBe(-0.5);
  });

  it('rechaza el texto vacío y el no numérico', () => {
    expect(parsePriceInput('')).toBeNull();
    expect(parsePriceInput('   ')).toBeNull();
    expect(parsePriceInput('abc')).toBeNull();
  });

  it('rechaza la notación exponencial y el hexadecimal', () => {
    expect(parsePriceInput('1e3')).toBeNull();
    expect(parsePriceInput('0x10')).toBeNull();
  });
});

describe('roundToDecimals (RF-410)', () => {
  it('redondea a los decimales del activo', () => {
    expect(roundToDecimals(1.1000049, 5)).toBe(1.1);
    expect(roundToDecimals(1.123456, 5)).toBe(1.12346);
  });

  it('no arrastra ruido binario', () => {
    expect(roundToDecimals(1.1, 5)).toBe(1.1);
  });
});

describe('validateOperationPrices (RF-410)', () => {
  it('devuelve el par redondeado y válido cuando los precios difieren', () => {
    const result = validateOperationPrices('1.10000', '1,09500');

    expect(result.entry).toBe(1.1);
    expect(result.stopLoss).toBe(1.095);
    expect(result.errors).toEqual({});
    expect(result.valid).toBe(true);
  });

  it('marca el campo Entrada cuando no es numérico', () => {
    const result = validateOperationPrices('abc', '1.095');

    expect(result.errors.entry).toBe(PRICE_ERROR_NOT_NUMBER);
    expect(result.errors.stopLoss).toBeUndefined();
    expect(result.entry).toBeNull();
    expect(result.valid).toBe(false);
  });

  it('marca el campo Stop Loss cuando no es numérico', () => {
    const result = validateOperationPrices('1.1', '');

    expect(result.errors.stopLoss).toBe(PRICE_ERROR_NOT_NUMBER);
    expect(result.valid).toBe(false);
  });

  it('marca riesgo nulo cuando Entrada y SL coinciden', () => {
    const result = validateOperationPrices('1.10000', '1,1');

    expect(result.errors.stopLoss).toBe(PRICE_ERROR_ZERO_RISK);
    expect(result.valid).toBe(false);
  });
});
