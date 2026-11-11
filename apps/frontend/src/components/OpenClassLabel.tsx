import { Radio } from 'lucide-react';
import { openClassLabel } from '../lib/live-class';
import { inlineIconStyle } from './inlineIcon';

interface OpenClassLabelProps {
    startsAt: Date;
    now: Date;
}

/** Etiqueta de una clase con la sala abierta; lleva el ícono de transmisión solo cuando ya está en vivo. */
export const OpenClassLabel = ({ startsAt, now }: OpenClassLabelProps) => (
    <>
        {now >= startsAt && <Radio size={16} strokeWidth={1.75} aria-hidden="true" style={inlineIconStyle} />}
        {openClassLabel(startsAt, now)}
    </>
);
