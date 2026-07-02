import { useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import type {
    EventInput,
    EventApi,
    DateSelectArg,
    EventClickArg,
    EventSourceFuncArg,
} from '@fullcalendar/core';
import esLocale from '@fullcalendar/core/locales/es';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { ScheduleEvent } from '@maris-nails/shared';
import type { ScheduleGateway } from '../../gateways/ScheduleGateway';
import { useToast } from '../../components/Toast';
import { API_URL } from '../../config';

interface Props {
    gateway: ScheduleGateway;
}

// Convierte la clave VAPID (base64url) al Uint8Array que espera pushManager.subscribe.
// Se construye sobre un ArrayBuffer explícito para que el tipo sea el que exige
// applicationServerKey (Uint8Array<ArrayBuffer>, no ArrayBufferLike).
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const buffer = new ArrayBuffer(raw.length);
    const output = new Uint8Array(buffer);
    for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
    return output;
}

// Date -> "YYYY-MM-DDTHH:MM" (hora local, para el input datetime-local).
function toLocalInput(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// "YYYY-MM-DDTHH:MM" (local) -> ISO wall-clock con segundos (sin zona horaria).
function toWallIso(local: string): string {
    return local.length === 16 ? `${local}:00` : local;
}

// ScheduleEvent (backend) -> evento de FullCalendar.
function toFcEvent(e: ScheduleEvent): EventInput {
    const isLive = e.sourceType === 'live_lesson';
    return {
        id: e.id,
        title: e.title,
        start: e.startAt,
        end: e.endAt,
        allDay: e.allDay,
        editable: !isLive, // las clases en vivo se editan desde su curso
        classNames: [isLive ? 'agenda-ev--live' : 'agenda-ev--personal'],
        extendedProps: {
            notes: e.notes ?? '',
            sourceType: e.sourceType,
            reminderMinutesBefore: e.reminderMinutesBefore ?? null,
        },
    };
}

interface ModalState {
    open: boolean;
    mode: 'create' | 'edit';
    id?: string;
    title: string;
    start: string; // datetime-local
    end: string;
    allDay: boolean;
    notes: string;
    reminderMinutesBefore: number | null;
    readOnly: boolean; // true para clases en vivo (solo lectura en la agenda)
}

const CLOSED: ModalState = {
    open: false,
    mode: 'create',
    title: '',
    start: '',
    end: '',
    allDay: false,
    notes: '',
    reminderMinutesBefore: null,
    readOnly: false,
};

/**
 * SchedulePage — Agenda/calendario del panel admin.
 *
 * Vistas mes/semana/día con FullCalendar. Crear tocando un hueco, editar/mover/
 * estirar los eventos. La regla anti-solape la impone el backend: si algo choca,
 * se revierte el cambio en el calendario y se muestra el motivo.
 */
export const SchedulePage: React.FC<Props> = ({ gateway }) => {
    const calendarRef = useRef<FullCalendar | null>(null);
    const [modal, setModal] = useState<ModalState>(CLOSED);
    const [saving, setSaving] = useState(false);
    const [enablingPush, setEnablingPush] = useState(false);
    const toast = useToast();

    // Activa las notificaciones push en ESTE dispositivo: pide permiso, se
    // suscribe con la clave VAPID del backend y guarda la suscripción.
    const enablePushReminders = async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            toast.error('Tu navegador no soporta notificaciones.');
            return;
        }
        setEnablingPush(true);
        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                toast.error('Permiso de notificaciones denegado.');
                return;
            }
            const reg = await navigator.serviceWorker.ready;
            const keyRes = await fetch(`${API_URL}/push/public-key`, {
                credentials: 'include',
            });
            const { publicKey } = await keyRes.json();
            if (!publicKey) {
                toast.error('El servidor aún no tiene las notificaciones configuradas.');
                return;
            }
            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey),
            });
            const json = sub.toJSON();
            await fetch(`${API_URL}/push/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
            });
            toast.success('Recordatorios activados en este dispositivo.');
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : 'No se pudieron activar los recordatorios',
            );
        } finally {
            setEnablingPush(false);
        }
    };

    // Fuente de eventos: FullCalendar la llama con el rango visible y en cada
    // navegación. refetchEvents() la vuelve a disparar tras crear/editar/borrar.
    const eventSource = useCallback(
        (
            info: EventSourceFuncArg,
            success: (events: EventInput[]) => void,
            failure: (error: Error) => void,
        ) => {
            gateway
                .list(info.startStr, info.endStr)
                .then((events) => success(events.map(toFcEvent)))
                .catch((err: unknown) =>
                    failure(err instanceof Error ? err : new Error('Error')),
                );
        },
        [gateway],
    );

    const refetch = () => calendarRef.current?.getApi().refetchEvents();

    // Tocar un hueco → crear.
    const handleSelect = (arg: DateSelectArg) => {
        setModal({
            open: true,
            mode: 'create',
            title: '',
            start: toLocalInput(arg.start),
            end: toLocalInput(arg.end),
            allDay: arg.allDay,
            notes: '',
            reminderMinutesBefore: null,
            readOnly: false,
        });
        arg.view.calendar.unselect();
    };

    // Click en un evento → editar (o ver, si es clase en vivo).
    const handleEventClick = (arg: EventClickArg) => {
        const e = arg.event;
        const isLive = e.extendedProps.sourceType === 'live_lesson';
        setModal({
            open: true,
            mode: 'edit',
            id: e.id,
            title: e.title,
            start: e.start ? toLocalInput(e.start) : '',
            end: e.end ? toLocalInput(e.end) : '',
            allDay: e.allDay,
            notes: (e.extendedProps.notes as string) ?? '',
            reminderMinutesBefore:
                (e.extendedProps.reminderMinutesBefore as number | null) ?? null,
            readOnly: isLive,
        });
    };

    // Arrastrar / estirar → actualizar horas; si el backend rechaza, revertir.
    const handleTimeChange = (arg: { event: EventApi; revert: () => void }) => {
        const e = arg.event;
        if (!e.start || !e.end) return;
        gateway
            .update(e.id, {
                startAt: toWallIso(toLocalInput(e.start)),
                endAt: toWallIso(toLocalInput(e.end)),
            })
            .catch((err: unknown) => {
                arg.revert();
                toast.error(err instanceof Error ? err.message : 'No se pudo mover');
            });
    };

    const handleSave = async () => {
        const title = modal.title.trim();
        if (!title) {
            toast.error('Ponle un nombre al evento.');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                title,
                startAt: toWallIso(modal.start),
                endAt: toWallIso(modal.end),
                allDay: modal.allDay,
                notes: modal.notes.trim() || undefined,
                reminderMinutesBefore: modal.reminderMinutesBefore,
            };
            if (modal.mode === 'create') {
                await gateway.create(payload);
                toast.success('Evento creado.');
            } else if (modal.id) {
                await gateway.update(modal.id, payload);
                toast.success('Evento actualizado.');
            }
            setModal(CLOSED);
            refetch();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'No se pudo guardar');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!modal.id) return;
        setSaving(true);
        try {
            await gateway.remove(modal.id);
            toast.success('Evento eliminado.');
            setModal(CLOSED);
            refetch();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'No se pudo borrar');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="admin-page">
            <Link to="/admin" className="back-link">← Volver al Panel</Link>
            <div className="admin-header">
                <h1>Agenda</h1>
                <p>Organiza tus clases, correcciones y eventos. Toca un hueco para crear.</p>
                <button
                    type="button"
                    className="btn-secondary"
                    onClick={enablePushReminders}
                    disabled={enablingPush}
                    style={{ marginTop: '0.5rem' }}
                >
                    🔔 {enablingPush ? 'Activando…' : 'Activar recordatorios'}
                </button>
            </div>

            <div className="admin-card agenda-calendar">
                <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="timeGridWeek"
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek,timeGridDay',
                    }}
                    locale={esLocale}
                    firstDay={1}
                    nowIndicator
                    allDaySlot
                    slotMinTime="06:00:00"
                    slotMaxTime="23:00:00"
                    height="auto"
                    selectable
                    selectMirror
                    editable
                    events={eventSource}
                    select={handleSelect}
                    eventClick={handleEventClick}
                    eventDrop={handleTimeChange}
                    eventResize={handleTimeChange}
                />
            </div>

            {modal.open && (
                <div className="agenda-modal__overlay" onClick={() => !saving && setModal(CLOSED)}>
                    <div className="agenda-modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="agenda-modal__title">
                            {modal.readOnly
                                ? 'Clase en vivo'
                                : modal.mode === 'create'
                                    ? 'Nuevo evento'
                                    : 'Editar evento'}
                        </h2>

                        {modal.readOnly && (
                            <p className="agenda-modal__hint">
                                Esta es una clase en vivo de un curso. Su horario se edita desde el curso.
                            </p>
                        )}

                        <label className="account-field__label">Nombre</label>
                        <input
                            type="text"
                            className="form-input"
                            maxLength={80}
                            value={modal.title}
                            disabled={modal.readOnly}
                            onChange={(e) => setModal((m) => ({ ...m, title: e.target.value }))}
                            placeholder="Ej: Corrección dual"
                        />

                        <div className="agenda-modal__row">
                            <div>
                                <label className="account-field__label">Inicio</label>
                                <input
                                    type="datetime-local"
                                    className="form-input"
                                    value={modal.start}
                                    disabled={modal.readOnly}
                                    onChange={(e) => setModal((m) => ({ ...m, start: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="account-field__label">Fin</label>
                                <input
                                    type="datetime-local"
                                    className="form-input"
                                    value={modal.end}
                                    disabled={modal.readOnly}
                                    onChange={(e) => setModal((m) => ({ ...m, end: e.target.value }))}
                                />
                            </div>
                        </div>

                        <label className="agenda-modal__check">
                            <input
                                type="checkbox"
                                checked={modal.allDay}
                                disabled={modal.readOnly}
                                onChange={(e) => setModal((m) => ({ ...m, allDay: e.target.checked }))}
                            />
                            Todo el día / varios días (no bloquea otras horas)
                        </label>

                        <label className="account-field__label">Notas (opcional)</label>
                        <textarea
                            className="form-input"
                            rows={2}
                            maxLength={500}
                            value={modal.notes}
                            disabled={modal.readOnly}
                            onChange={(e) => setModal((m) => ({ ...m, notes: e.target.value }))}
                        />

                        <label className="account-field__label">Recordarme</label>
                        <select
                            className="form-input"
                            value={modal.reminderMinutesBefore ?? ''}
                            disabled={modal.readOnly}
                            onChange={(e) =>
                                setModal((m) => ({
                                    ...m,
                                    reminderMinutesBefore:
                                        e.target.value === '' ? null : Number(e.target.value),
                                }))
                            }
                        >
                            <option value="">Sin recordatorio</option>
                            <option value="15">15 minutos antes</option>
                            <option value="30">30 minutos antes</option>
                            <option value="60">1 hora antes</option>
                            <option value="1440">1 día antes</option>
                        </select>

                        <div className="agenda-modal__actions">
                            {modal.mode === 'edit' && !modal.readOnly && (
                                <button
                                    type="button"
                                    className="btn-secondary agenda-modal__delete"
                                    onClick={handleDelete}
                                    disabled={saving}
                                >
                                    Eliminar
                                </button>
                            )}
                            <span style={{ flex: 1 }} />
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setModal(CLOSED)}
                                disabled={saving}
                            >
                                {modal.readOnly ? 'Cerrar' : 'Cancelar'}
                            </button>
                            {!modal.readOnly && (
                                <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={handleSave}
                                    disabled={saving}
                                >
                                    {saving ? 'Guardando…' : 'Guardar'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
