import { useState, useCallback } from "react";

interface HistoryState<T> {
    past: T[];
    present: T | null;
    future: T[];
}

export function useHistory<T>(initialPresent: T) {
    const [state, setState] = useState<HistoryState<T>>({
        past: [],
        present: initialPresent,
        future: [],
    });

    const canUndo = state.past.length > 0;
    const canRedo = state.future.length > 0;

    const undo = useCallback(() => {
        setState((currentState) => {
            if (currentState.past.length === 0) return currentState;

            const previous = currentState.past[currentState.past.length - 1];
            const newPast = currentState.past.slice(0, currentState.past.length - 1);

            return {
                past: newPast,
                present: previous,
                future: [currentState.present!, ...currentState.future],
            };
        });
    }, []);

    const redo = useCallback(() => {
        setState((currentState) => {
            if (currentState.future.length === 0) return currentState;

            const next = currentState.future[0];
            const newFuture = currentState.future.slice(1);

            return {
                past: [...currentState.past, currentState.present!],
                present: next,
                future: newFuture,
            };
        });
    }, []);

    const setAndAddHistory = useCallback((newPresent: T) => {
        setState((currentState) => {
            // If the new state is identical to the current one, don't add to history
            if (currentState.present === newPresent) return currentState;

            return {
                past: [...currentState.past, currentState.present!],
                present: newPresent,
                future: [], // Clear future on new action
            };
        });
    }, []);

    const setAndOverwriteHistory = useCallback((newPresent: T) => {
        setState((currentState) => {
            return {
                ...currentState,
                present: newPresent
            };
        });
    }, []);

    // Safe reset if needed (e.g. loading a new map)
    const resetHistory = useCallback((newPresent: T) => {
        setState({
            past: [],
            present: newPresent,
            future: []
        });
    }, []);

    return {
        state: state.present,
        undo,
        redo,
        set: setAndAddHistory,
        setOverwrite: setAndOverwriteHistory,
        reset: resetHistory,
        canUndo,
        canRedo,
        historyState: state // Expose full state if needed for debugging
    };
}
