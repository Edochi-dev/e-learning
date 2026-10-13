import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UpdatePrompt } from './UpdatePrompt';

const setNeedRefresh = vi.fn();
const updateServiceWorker = vi.fn();
let needRefresh = false;

vi.mock('virtual:pwa-register/react', () => ({
    useRegisterSW: () => ({
        needRefresh: [needRefresh, setNeedRefresh],
        offlineReady: [false, vi.fn()],
        updateServiceWorker,
    }),
}));

describe('UpdatePrompt', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('no muestra nada si no hay versión nueva', () => {
        needRefresh = false;
        render(<UpdatePrompt />);

        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('aplica la actualización al pulsar "Actualizar"', async () => {
        needRefresh = true;
        render(<UpdatePrompt />);

        await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }));

        expect(updateServiceWorker).toHaveBeenCalledWith(true);
        expect(screen.getByRole('button', { name: 'Actualizando…' })).toBeDisabled();
    });

    it('oculta el aviso al pulsar "Más tarde"', async () => {
        needRefresh = true;
        render(<UpdatePrompt />);

        await userEvent.click(screen.getByRole('button', { name: 'Más tarde' }));

        expect(setNeedRefresh).toHaveBeenCalledWith(false);
        expect(updateServiceWorker).not.toHaveBeenCalled();
    });
});
