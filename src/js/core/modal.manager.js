class ModalManager {
    constructor() {
        this.modals = new Map();
        this.activeModal = null;
        this.init();
    }

    init() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModal) {
                this.close(this.activeModal);
            }
        });
    }

    open(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return false;

        if (this.activeModal && this.activeModal !== modalId) {
            this.close(this.activeModal);
        }

        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        this.activeModal = modalId;
        this.modals.set(modalId, {
            element: modal,
            openedAt: Date.now()
        });

        this.applyModalStyles(modal);

        setTimeout(() => {
            const firstInput = modal.querySelector('input:not([type="hidden"]), textarea, select');
            if (firstInput) firstInput.focus();
        }, 100);

        const overlay = modal.querySelector('.modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => {
                this.close(modalId);
            });
        }

        this.setupCloseButtons(modal, modalId);
        this.emit('modal-opened', { modalId });

        return true;
    }

    close(modalId) {
        const modalData = this.modals.get(modalId);
        if (!modalData) return false;

        const { element } = modalData;

        element.style.display = 'none';
        document.body.style.overflow = '';

        const forms = element.querySelectorAll('form');
        forms.forEach(form => form.reset());

        this.modals.delete(modalId);
        if (this.activeModal === modalId) {
            this.activeModal = null;
        }

        this.emit('modal-closed', { modalId });
        return true;
    }

    closeAll() {
        this.modals.forEach((_, modalId) => {
            this.close(modalId);
        });
    }

    isOpen(modalId) {
        return this.modals.has(modalId);
    }

    getActive() {
        return this.activeModal;
    }

    applyModalStyles(modal) {
        Object.assign(modal.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            zIndex: '9999',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.3s ease'
        });

        const overlay = modal.querySelector('.modal-overlay');
        if (overlay) {
            Object.assign(overlay.style, {
                position: 'absolute',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                background: 'rgba(0, 0, 0, 0.8)',
                backdropFilter: 'blur(4px)',
                cursor: 'pointer'
            });
        }

        const content = modal.querySelector('.modal-content');
        if (content) {
            Object.assign(content.style, {
                position: 'relative',
                zIndex: '1',
                background: 'var(--surface, #1e293b)',
                borderRadius: '12px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                maxWidth: '90%',
                maxHeight: '90vh',
                overflow: 'auto'
            });
        }
    }

    setupCloseButtons(modal, modalId) {
        const closeButtons = modal.querySelectorAll('.modal-close, [data-modal-close]');

        closeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.close(modalId);
            });
        });
    }

    confirm(title, message, onConfirm, onCancel) {
        const modal = document.getElementById('confirmModal');
        if (!modal) return;

        const titleEl = modal.querySelector('#confirmTitle');
        const messageEl = modal.querySelector('#confirmMessage');

        if (titleEl) titleEl.textContent = title;
        if (messageEl) messageEl.textContent = message;

        const confirmBtn = modal.querySelector('#confirmOk');
        const cancelBtn = modal.querySelector('#confirmCancel');

        const newConfirmBtn = confirmBtn.cloneNode(true);
        const newCancelBtn = cancelBtn.cloneNode(true);

        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

        newConfirmBtn.addEventListener('click', () => {
            this.close('confirmModal');
            if (onConfirm) onConfirm();
        });

        newCancelBtn.addEventListener('click', () => {
            this.close('confirmModal');
            if (onCancel) onCancel();
        });

        this.open('confirmModal');
    }

    emit(eventName, detail = {}) {
        document.dispatchEvent(new CustomEvent(eventName, { detail }));
    }

    on(eventName, callback) {
        document.addEventListener(eventName, (e) => {
            callback(e.detail);
        });
    }
}

const modalManager = new ModalManager();

export default modalManager;
export { ModalManager };