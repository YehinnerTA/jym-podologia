import React from 'react';

export interface AppTableColumn<T> {
    key: string;
    header: string;
    width?: string;
    align?: 'left' | 'center' | 'right';
    render?: (row: T) => React.ReactNode;
    sortable?: boolean;
}

export interface AppTableProps<T> {
    columns: AppTableColumn<T>[];
    data: T[];
    rowKey: (row: T) => string;
    loading?: boolean;
    emptyMessage?: string;
    onRowClick?: (row: T) => void;
    sortKey?: string;
    sortDirection?: 'asc' | 'desc';
    onSort?: (key: string) => void;
    selectedKeys?: string[];
    onSelectionChange?: (keys: string[]) => void;
}

export function AppTable<T>({
    columns,
    data,
    rowKey,
    loading = false,
    emptyMessage = 'No hay datos disponibles',
    onRowClick,
    sortKey,
    sortDirection,
    onSort,
    selectedKeys = [],
    onSelectionChange,
}: AppTableProps<T>) {
    const allSelected = data.length > 0 && data.every((r) => selectedKeys.includes(rowKey(r)));

    const toggleAll = () => {
        if (!onSelectionChange) return;
        if (allSelected) onSelectionChange([]);
        else onSelectionChange(data.map(rowKey));
    };

    const toggleOne = (key: string) => {
        if (!onSelectionChange) return;
        if (selectedKeys.includes(key)) {
            onSelectionChange(selectedKeys.filter((k) => k !== key));
        } else {
            onSelectionChange([...selectedKeys, key]);
        }
    };

    return (
        <div className="app-table-wrapper">
            <table className="app-table">
                <thead>
                    <tr>
                        {onSelectionChange && (
                            <th className="app-table-checkbox-cell">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={toggleAll}
                                    aria-label="Seleccionar todo"
                                />
                            </th>
                        )}
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                style={{ width: col.width, textAlign: col.align || 'left' }}
                                className={col.sortable && onSort ? 'app-table-sortable' : ''}
                                onClick={() => col.sortable && onSort?.(col.key)}
                            >
                                <span className="app-table-th-content">
                                    {col.header}
                                    {col.sortable && onSort && (
                                        <i
                                            className={`fa-solid ${sortKey === col.key
                                                ? sortDirection === 'asc'
                                                    ? 'fa-sort-up'
                                                    : 'fa-sort-down'
                                                : 'fa-sort'
                                                } app-table-sort-icon`}
                                        ></i>
                                    )}
                                </span>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr>
                            <td colSpan={columns.length + (onSelectionChange ? 1 : 0)} className="app-table-loading">
                                <i className="fa-solid fa-spinner fa-spin"></i>
                                <span>Cargando...</span>
                            </td>
                        </tr>
                    ) : data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length + (onSelectionChange ? 1 : 0)} className="app-table-empty">
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        data.map((row) => {
                            const key = rowKey(row);
                            const selected = selectedKeys.includes(key);
                            return (
                                <tr
                                    key={key}
                                    className={`${onRowClick ? 'app-table-clickable' : ''} ${selected ? 'app-table-selected' : ''}`}
                                    onClick={() => onRowClick?.(row)}
                                >
                                    {onSelectionChange && (
                                        <td className="app-table-checkbox-cell" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={selected}
                                                onChange={() => toggleOne(key)}
                                                aria-label={`Seleccionar fila`}
                                            />
                                        </td>
                                    )}
                                    {columns.map((col) => (
                                        <td key={col.key} style={{ textAlign: col.align || 'left' }}>
                                            {col.render ? col.render(row) : (row as any)[col.key]}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );
}