export function formatDate(timestamp) {
    if (!timestamp) return 'Sin fecha';
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        if (isNaN(date.getTime())) return 'Fecha inválida';
        const now = new Date();
        const diff = Math.abs(now - date);
        const minutes = Math.ceil(diff / (1000 * 60));
        const hours = Math.ceil(diff / (1000 * 60 * 60));
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

        if (minutes < 60) { return `Hace ${minutes} min`; }
        if (hours < 24) { return `Hace ${hours}h`; }
        if (days <= 7) { return `Hace ${days} ${days === 1 ? 'día' : 'días'}`; }

        // fecha completa
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        return 'Error en la fecha';
    }
}

// truncar el texto a un máximo de caracteres
export function truncate(text, maxLength = 100) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// aplicar capitalize a la primera letra del string
export function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// generar id unico
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// validar email
export function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

export function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export function throttle(func, limit = 300) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

export function sanitizeHTML(str) {
    if (!str) return '';
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

export function getElement(selector) {
    return document.querySelector(selector);
}

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function isMobile() {
    return window.innerWidth <= 768;
}

export function isLocalhost() {
    return ['localhost', '127.0.0.1', ''].includes(window.location.hostname);
}

export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();

        try {
            document.execCommand('copy');
            document.body.removeChild(textarea);
            return true;
        } catch (err) {
            document.body.removeChild(textarea);
            return false;
        }
    }
}

export function formatNumber(num) {
    return new Intl.NumberFormat('es-ES').format(num);
}

// manejo del localStorage
export function getLocalStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        return defaultValue;
    }
}

export function setLocalStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        return false;
    }
}

export function removeLocalStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        return false;
    }
}

export function clearLocalStorage() {
    try {
        localStorage.clear();
        return true;
    } catch (error) {
        return false;
    }
}

// extraer el id de un archivo de uploadcare desde url
export function extractUploadcareId(url) {
    if (!url) return null;
    const patterns = [
        /ucarecdn\.com\/([a-zA-Z0-9-_]+)\/?/,
        /2kupnha500\.ucarecdn\.net\/([a-zA-Z0-9-_]+)\/?/,
        /^([a-zA-Z0-9-_]{36})$/
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) return match[1];
    }
    return null;
}

// generar un preview
export function getUploadcarePreviewUrl(fileId, width = 400, height = 300) {
    return `https://ucarecdn.com/${fileId}/-/preview/${width}x${height}/-/format/auto/-/quality/smart/`;
}

export function getUploadcareOriginalUrl(fileId) {
    return `https://ucarecdn.com/${fileId}/`;
}