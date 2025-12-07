class ToastManager {
    constructor() {
        this.container = null;
        this.toasts = new Map();
        this.maxToasts = 5;
        this.defaultDuration = 4000;
        this.init();
    }

    init() {
        this.container = document.getElementById('toastContainer');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toastContainer';
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
        this.applyStyles();
    }

    applyStyles() {
        // estilos definidos en src/css/components/_toasts.css
    }

    success(message, duration = this.defaultDuration) {
        return this.show(message, 'success', duration);
    }

    error(message, duration = this.defaultDuration) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration = this.defaultDuration) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration = this.defaultDuration) {
        return this.show(message, 'info', duration);
    }

    show(message, type = 'info', duration = this.defaultDuration) {
        if (this.toasts.size >= this.maxToasts) {
            const firstToast = this.toasts.keys().next().value;
            this.remove(firstToast);
        }

        const toastId = this.generateId();
        const toast = this.createToast(toastId, message, type);

        this.toasts.set(toastId, {
            element: toast,
            timeout: null
        });

        this.container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        });

        if (duration > 0) {
            const timeout = setTimeout(() => {
                this.remove(toastId);
            }, duration);
            this.toasts.get(toastId).timeout = timeout;
        }

        return toastId;
    }

    createToast(id, message, type) {
        const toast = document.createElement('div');
        toast.id = `toast-${id}`;
        toast.className = `toast toast-${type}`;
        toast.setAttribute('data-toast-id', id);

        const config = this.getToastConfig(type);

        // animacion inicial
        toast.style.transform = 'translateX(400px)';
        toast.style.opacity = '0';

        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${config.icon}</span>
                <span class="toast-message">${this.sanitize(message)}</span>
            </div>
            <button class="toast-close">×</button>
        `;

        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.remove(id);
        });

        toast.addEventListener('click', () => {
            this.remove(id);
        });

        toast.addEventListener('mouseenter', () => {
            const toastData = this.toasts.get(id);
            if (toastData && toastData.timeout) {
                clearTimeout(toastData.timeout);
                toastData.timeout = null;
            }
        });

        toast.addEventListener('mouseleave', () => {
            const toastData = this.toasts.get(id);
            if (toastData && !toastData.timeout) {
                const timeout = setTimeout(() => {
                    this.remove(id);
                }, 2000);
                toastData.timeout = timeout;
            }
        });

        return toast;
    }

    getToastConfig(type) {
        const configs = {
            success: {
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                borderColor: 'rgba(16, 185, 129, 0.3)',
                icon: '✅'
            },
            error: {
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                icon: '❌'
            },
            warning: {
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                borderColor: 'rgba(245, 158, 11, 0.3)',
                icon: '⚠️'
            },
            info: {
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                borderColor: 'rgba(59, 130, 246, 0.3)',
                icon: 'ℹ️'
            }
        };
        return configs[type] || configs.info;
    }

    remove(toastId) {
        const toastData = this.toasts.get(toastId);
        if (!toastData) return;

        const { element, timeout } = toastData;

        if (timeout) {
            clearTimeout(timeout);
        }

        element.style.transform = 'translateX(400px)';
        element.style.opacity = '0';

        setTimeout(() => {
            if (element.parentElement) {
                element.remove();
            }
            this.toasts.delete(toastId);
        }, 300);
    }

    removeAll() {
        this.toasts.forEach((_, toastId) => {
            this.remove(toastId);
        });
    }

    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    sanitize(message) {
        const div = document.createElement('div');
        div.textContent = message;
        return div.innerHTML;
    }

    configure(config = {}) {
        if (config.maxToasts !== undefined) {
            this.maxToasts = config.maxToasts;
        }
        if (config.defaultDuration !== undefined) {
            this.defaultDuration = config.defaultDuration;
        }
    }

    getActiveCount() {
        return this.toasts.size;
    }

    hasActive() {
        return this.toasts.size > 0;
    }
}

const toastManager = new ToastManager();

export default toastManager;
export { ToastManager };