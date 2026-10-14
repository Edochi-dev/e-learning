import React from 'react';
import type { CertificateCourse, CertificateSearchFilters } from '../gateways/CertificateGateway';

interface Props {
    filters: CertificateSearchFilters;
    courses: CertificateCourse[];
    onChange: (filters: CertificateSearchFilters) => void;
}

export const CertificateSearchFiltersForm: React.FC<Props> = ({ filters, courses, onChange }) => {
    const update = (key: keyof CertificateSearchFilters, value: string) => {
        onChange({ ...filters, [key]: value || undefined });
    };
    const hasFilters = Object.values(filters).some(Boolean);

    return (
        <div className="cert-search__filters">
            <label className="cert-search__field cert-search__field--wide">
                <span>Nombre o número</span>
                <input
                    type="search"
                    className="filter-control"
                    value={filters.search ?? ''}
                    onChange={e => update('search', e.target.value)}
                    placeholder="Ej. Ana Pérez o MEP-00012"
                />
            </label>

            <label className="cert-search__field">
                <span>Curso</span>
                <select
                    className="filter-control"
                    value={filters.course ?? ''}
                    onChange={e => update('course', e.target.value)}
                >
                    <option value="">Todos los cursos</option>
                    {courses.map(c => (
                        <option key={c.abbreviation} value={c.abbreviation}>
                            {c.name} ({c.abbreviation})
                        </option>
                    ))}
                </select>
            </label>

            <label className="cert-search__field">
                <span>Desde</span>
                <input
                    type="date"
                    className="filter-control"
                    value={filters.from ?? ''}
                    max={filters.to}
                    onChange={e => update('from', e.target.value)}
                />
            </label>

            <label className="cert-search__field">
                <span>Hasta</span>
                <input
                    type="date"
                    className="filter-control"
                    value={filters.to ?? ''}
                    min={filters.from}
                    onChange={e => update('to', e.target.value)}
                />
            </label>

            <label className="cert-search__field">
                <span>Cuenta</span>
                <select
                    className="filter-control"
                    value={filters.account ?? ''}
                    onChange={e => update('account', e.target.value)}
                >
                    <option value="">Con y sin cuenta</option>
                    <option value="linked">Ligados a una alumna</option>
                    <option value="unlinked">Sin cuenta</option>
                </select>
            </label>

            {hasFilters && (
                <button type="button" className="btn-secondary cert-search__clear" onClick={() => onChange({})}>
                    Limpiar filtros
                </button>
            )}
        </div>
    );
};
