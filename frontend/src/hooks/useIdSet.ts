import { useCallback, useState } from 'react';

export type IdSet = ReturnType<typeof useIdSet>;

// a set of ids the person ticked, such as selected videos or the ones to transcribe
export function useIdSet() {
  const [ids, setIds] = useState<ReadonlySet<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // adds every id when any is missing, otherwise removes them all: the "select all" checkbox
  const toggleMany = useCallback((manyIds: string[]) => {
    setIds((previous) => {
      const next = new Set(previous);
      const hasAll = manyIds.every((id) => next.has(id));
      for (const id of manyIds) {
        if (hasAll) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }, []);

  return { ids, toggle, toggleMany };
}
