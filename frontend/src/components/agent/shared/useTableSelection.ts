import { useState, useCallback, useMemo } from 'react';

export interface UseTableSelectionReturn<T = number> {
  selectedIds: T[];
  selectedCount: number;
  isSelected: (id: T) => boolean;
  toggleSelect: (id: T) => void;
  toggle: (id: T) => void;
  selectAll: (pageIds: T[]) => void;
  isAllSelected: (pageIds: T[]) => boolean;
  isIndeterminate: (pageIds: T[]) => boolean;
  clearSelection: () => void;
  setSelectedIds: React.Dispatch<React.SetStateAction<T[]>>;
}

export function useTableSelection<T extends string | number = number>(
  initialSelected: T[] = []
): UseTableSelectionReturn<T> {
  const [selectedIds, setSelectedIds] = useState<T[]>(initialSelected);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const isSelected = useCallback(
    (id: T) => selectedSet.has(id),
    [selectedSet]
  );

  const toggleSelect = useCallback((id: T) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const selectAll = useCallback((pageIds: T[]) => {
    setSelectedIds((prev) => {
      const prevSet = new Set(prev);
      const allInPageSelected = pageIds.length > 0 && pageIds.every((id) => prevSet.has(id));

      if (allInPageSelected) {
        // Unselect all items on this page
        const pageSet = new Set(pageIds);
        return prev.filter((id) => !pageSet.has(id));
      } else {
        // Select all items on this page
        const combined = new Set([...prev, ...pageIds]);
        return Array.from(combined);
      }
    });
  }, []);

  const isAllSelected = useCallback(
    (pageIds: T[]) => {
      if (pageIds.length === 0) return false;
      return pageIds.every((id) => selectedSet.has(id));
    },
    [selectedSet]
  );

  const isIndeterminate = useCallback(
    (pageIds: T[]) => {
      if (pageIds.length === 0) return false;
      const count = pageIds.filter((id) => selectedSet.has(id)).length;
      return count > 0 && count < pageIds.length;
    },
    [selectedSet]
  );

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  return {
    selectedIds,
    selectedCount: selectedIds.length,
    isSelected,
    toggleSelect,
    toggle: toggleSelect,
    selectAll,
    isAllSelected,
    isIndeterminate,
    clearSelection,
    setSelectedIds,
  };
}

export type TableSelection<T = number> = UseTableSelectionReturn<T>;

export default useTableSelection;
