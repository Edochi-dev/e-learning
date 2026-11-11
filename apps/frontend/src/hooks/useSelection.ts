import { useState, useMemo, useCallback } from 'react';

/**
 * Multi-selection over a list that can change underneath it (filters, reloads).
 * `selected` only ever contains items still present in `items`, so an action
 * can never reach a row the user can no longer see.
 */
export function useSelection<T extends { id: string }>(items: T[]) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const selected = useMemo(
        () => items.filter(item => selectedIds.has(item.id)),
        [items, selectedIds],
    );
    const allSelected = items.length > 0 && selected.length === items.length;

    const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

    const toggle = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const toggleAll = useCallback(() => {
        setSelectedIds(allSelected ? new Set() : new Set(items.map(item => item.id)));
    }, [allSelected, items]);

    const clear = useCallback(() => setSelectedIds(new Set()), []);

    return { selected, allSelected, isSelected, toggle, toggleAll, clear };
}
