import { isMobile } from "../core/utils.js";

export default class NavbarComponent {
  constructor(options = {}) {
    this.desktopSelector = options.desktopSelector || '.nav-item';
    this.mobileSelector = options.mobileSelector || '.mobile-nav-item';
    this.activeClass = options.activeClass || 'active';
    this.delegateClick = this.delegateClick.bind(this);
    this.delegateKey = this.delegateKey.bind(this);
  }

  init() {
    const saved = localStorage.getItem('activeSection') || 'dashboard';
    this.setActiveSection(saved);
    document.addEventListener('click', this.delegateClick, { passive: false });
    document.addEventListener('keydown', this.delegateKey);
    document.addEventListener('navigationChange', (e) => {
      const sectionId = e?.detail?.sectionId;
      if (sectionId) this.setActiveSection(sectionId);
    });
  }

  destroy() {
    document.removeEventListener('click', this.delegateClick);
    document.removeEventListener('keydown', this.delegateKey);
  }

  delegateClick(e) {
    const btn = e.target.closest('[data-section]');
    if (!btn) return;
    e.preventDefault();
    const section = btn.dataset.section;
    if (!section) return;
    this.handleNavigation(section, btn);
  }

  delegateKey(e) {
    if ((e.key === 'Enter' || e.key === ' ') && document.activeElement) {
      const el = document.activeElement;
      if (el && el.hasAttribute('data-section')) {
        e.preventDefault();
        const section = el.getAttribute('data-section');
        if (section) this.handleNavigation(section, el);
      }
    }
  }

  handleNavigation(section, element = null) {
    this.setActiveSection(section);
    this.emitNavigate(section);
    if (element) {
      try {
        if (isMobile()) this.createPulseEffect(element);
        else this.createRippleEffect(element);
      } catch (error) {}
    }
    const targetSection = document.getElementById(section + 'Section');
    if (targetSection) targetSection.setAttribute('tabindex', '-1');
  }

  setActiveSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove(this.activeClass));
    document.querySelectorAll(this.desktopSelector).forEach(n => n.classList.remove(this.activeClass));
    document.querySelectorAll(this.mobileSelector).forEach(n => n.classList.remove(this.activeClass));

    const sectionEl = document.getElementById(sectionId + 'Section');
    if (sectionEl) sectionEl.classList.add(this.activeClass);

    const desktopBtn = document.querySelector(`${this.desktopSelector}[data-section="${sectionId}"]`);
    const mobileBtn = document.querySelector(`${this.mobileSelector}[data-section="${sectionId}"]`);

    if (desktopBtn) desktopBtn.classList.add(this.activeClass);
    if (mobileBtn) mobileBtn.classList.add(this.activeClass);

    try {
      localStorage.setItem('activeSection', sectionId);
    } catch (e) {}
  }

  emitNavigate(section) {
    document.dispatchEvent(new CustomEvent('navigate', { detail: { section } }));
  }

  createRippleEffect(element) {
    const ripple = document.createElement('div');
    ripple.className = 'nav-ripple';
    // estilos mínimos
    ripple.style.cssText = `
      position: absolute;
      border-radius: 50%;
      background: rgba(0,245,255,0.18);
      transform: scale(0);
      width: 24px;
      height: 24px;
      left: 50%;
      top: 50%;
      margin-left: -12px;
      margin-top: -12px;
      pointer-events: none;
      animation: navRipple 520ms ease-out forwards;
      z-index: 10;
    `;
    // asegurar posicion relativa en el elemento
    const prevPos = element.style.position;
    if (!prevPos || prevPos === '') element.style.position = 'relative';
    element.appendChild(ripple);
    const cleanup = () => {
      if (ripple && ripple.parentElement) ripple.remove();
      if (!prevPos) element.style.position = '';
      ripple.removeEventListener('animationend', cleanup);
    };
    ripple.addEventListener('animationend', cleanup);
    setTimeout(cleanup, 700);
  }

  // efecto pulso para movil
  createPulseEffect(element) {
    const pulse = document.createElement('div');
    pulse.className = 'nav-pulse';
    pulse.style.cssText = `
      position: absolute;
      inset: 0;
      border-radius: 12px;
      background: rgba(0,245,255,0.12);
      pointer-events: none;
      animation: navPulse 320ms ease-out forwards;
      z-index: 5;
    `;
    const prevPos = element.style.position;
    if (!prevPos || prevPos === '') element.style.position = 'relative';
    element.appendChild(pulse);
    const cleanup = () => {
      if (pulse && pulse.parentElement) pulse.remove();
      if (!prevPos) element.style.position = '';
      pulse.removeEventListener('animationend', cleanup);
    };
    pulse.addEventListener('animationend', cleanup);
    setTimeout(cleanup, 420);
  }
}