// ===== NAVEGACIÓN MODERNA - FUNCIONALIDAD =====
// Actualizado: 2025-07-09 19:05:57 UTC - EiderMontalvo

document.addEventListener('DOMContentLoaded', function() {
  initModernNavigation();
});

function initModernNavigation() {
  // Elementos de navegación
  const desktopNavItems = document.querySelectorAll('.nav-item');
  const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
  const contentSections = document.querySelectorAll('.content-section');
  
  // Función para cambiar sección activa
  function setActiveSection(sectionId) {
    // Remover clase active de todas las secciones
    contentSections.forEach(section => {
      section.classList.remove('active');
    });
    
    // Remover clase active de todos los nav items
    [...desktopNavItems, ...mobileNavItems].forEach(item => {
      item.classList.remove('active');
    });
    
    // Activar la sección seleccionada
    const targetSection = document.getElementById(sectionId + 'Section');
    if (targetSection) {
      targetSection.classList.add('active');
    }
    
    // Activar el nav item correspondiente (desktop y mobile)
    const activeDesktopItem = document.querySelector(`.nav-item[data-section="${sectionId}"]`);
    const activeMobileItem = document.querySelector(`.mobile-nav-item[data-section="${sectionId}"]`);
    
    if (activeDesktopItem) activeDesktopItem.classList.add('active');
    if (activeMobileItem) activeMobileItem.classList.add('active');
    
    // Efecto de vibración en mobile (si está disponible)
    if (navigator.vibrate && window.innerWidth <= 767) {
      navigator.vibrate(50);
    }
    
    // Guardar estado en localStorage
    localStorage.setItem('activeSection', sectionId);
  }
  
  // Event listeners para navegación desktop
  desktopNavItems.forEach(item => {
    item.addEventListener('click', function() {
      const sectionId = this.dataset.section;
      setActiveSection(sectionId);
      
      // Efecto de onda
      createRippleEffect(this);
    });
    
    // Efecto hover mejorado
    item.addEventListener('mouseenter', function() {
      if (!this.classList.contains('active')) {
        this.style.transform = 'translateY(-6px) scale(1.05)';
      }
    });
    
    item.addEventListener('mouseleave', function() {
      if (!this.classList.contains('active')) {
        this.style.transform = '';
      }
    });
  });
  
  // Event listeners para navegación mobile
  mobileNavItems.forEach(item => {
    item.addEventListener('click', function() {
      const sectionId = this.dataset.section;
      setActiveSection(sectionId);
      
      // Efecto de pulso
      createPulseEffect(this);
    });
    
    // Mejorar feedback táctil
    item.addEventListener('touchstart', function() {
      this.style.transform = 'scale(0.9)';
    });
    
    item.addEventListener('touchend', function() {
      setTimeout(() => {
        this.style.transform = '';
      }, 150);
    });
  });
  
  // Restaurar sección activa desde localStorage
  const savedSection = localStorage.getItem('activeSection');
  if (savedSection) {
    setActiveSection(savedSection);
  } else {
    setActiveSection('dashboard'); // Sección por defecto
  }
  
  // Función para crear efecto de onda
  function createRippleEffect(element) {
    const ripple = document.createElement('div');
    ripple.className = 'nav-ripple';
    ripple.style.cssText = `
      position: absolute;
      border-radius: 50%;
      background: rgba(0, 212, 255, 0.6);
      transform: scale(0);
      animation: ripple 0.6s linear;
      left: 50%;
      top: 50%;
      width: 20px;
      height: 20px;
      margin-left: -10px;
      margin-top: -10px;
      pointer-events: none;
    `;
    
    element.style.position = 'relative';
    element.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 600);
  }
  
  // Función para crear efecto de pulso
  function createPulseEffect(element) {
    const pulse = document.createElement('div');
    pulse.className = 'nav-pulse';
    pulse.style.cssText = `
      position: absolute;
      inset: 0;
      border-radius: 16px;
      background: rgba(0, 212, 255, 0.3);
      animation: pulse 0.4s ease-out;
      pointer-events: none;
    `;
    
    element.style.position = 'relative';
    element.appendChild(pulse);
    
    setTimeout(() => {
      pulse.remove();
    }, 400);
  }
}

// CSS para animaciones dinámicas
const dynamicStyles = `
  @keyframes ripple {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
  
  @keyframes pulse {
    0% {
      transform: scale(1);
      opacity: 0.6;
    }
    100% {
      transform: scale(1.2);
      opacity: 0;
    }
  }
`;

// Agregar estilos dinámicos
const styleSheet = document.createElement('style');
styleSheet.textContent = dynamicStyles;
document.head.appendChild(styleSheet);

// Función global para cambiar sección (para usar desde otros scripts)
window.setActiveSection = function(sectionId) {
  const event = new CustomEvent('navigationChange', { detail: { sectionId } });
  document.dispatchEvent(event);
};