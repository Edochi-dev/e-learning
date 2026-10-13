import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSelection } from './useSelection';

const a = { id: 'a' };
const b = { id: 'b' };
const c = { id: 'c' };

describe('useSelection', () => {
  it('marca y desmarca elementos sueltos', () => {
    const { result } = renderHook(() => useSelection([a, b, c]));

    act(() => result.current.toggle('a'));
    act(() => result.current.toggle('c'));
    expect(result.current.selected).toEqual([a, c]);

    act(() => result.current.toggle('a'));
    expect(result.current.selected).toEqual([c]);
  });

  it('seleccionar todo y volver a pulsarlo deselecciona todo', () => {
    const { result } = renderHook(() => useSelection([a, b]));

    act(() => result.current.toggleAll());
    expect(result.current.allSelected).toBe(true);

    act(() => result.current.toggleAll());
    expect(result.current.selected).toEqual([]);
  });

  it('un elemento que deja de estar en la lista no cuenta como seleccionado', () => {
    const { result, rerender } = renderHook(({ items }) => useSelection(items), {
      initialProps: { items: [a, b, c] },
    });

    act(() => result.current.toggleAll());
    rerender({ items: [a] });

    expect(result.current.selected).toEqual([a]);
    expect(result.current.allSelected).toBe(true);
  });

  it('una lista vacía nunca está "toda seleccionada"', () => {
    const { result } = renderHook(() => useSelection<{ id: string }>([]));

    expect(result.current.allSelected).toBe(false);
  });
});
