document.addEventListener('DOMContentLoaded', function() {
  initModernNavigation();
});

function initModernNavigation() {
  const desktopNavItems = document.querySelectorAll('.nav-item');
  const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
  const contentSections = document.querySelectorAll('.content-section');
  
  function setActiveSection(sectionId) {
    contentSections.forEach(section => {
      section.classList.remove('active');
    });
    
    [...desktopNavItems, ...mobileNavItems].forEach(item => {
      item.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionId + 'Section');
    if (targetSection) {
      targetSection.classList.add('active');
    }
    
    const activeDesktopItem = document.querySelector(`.nav-item[data-section="${sectionId}"]`);
    const activeMobileItem = document.querySelector(`.mobile-nav-item[data-section="${sectionId}"]`);
    
    if (activeDesktopItem) activeDesktopItem.classList.add('active');
    if (activeMobileItem) activeMobileItem.classList.add('active');
    
    if (navigator.vibrate && window.innerWidth <= 767) {
      navigator.vibrate(30);
    }
    
    localStorage.setItem('activeSection', sectionId);
  }
  
  desktopNavItems.forEach(item => {
    item.addEventListener('click', function() {
      const sectionId = this.dataset.section;
      setActiveSection(sectionId);
      createRippleEffect(this);
    });
    
    item.addEventListener('mouseenter', function() {
      if (!this.classList.contains('active')) {
        this.style.transform = 'translateY(-4px) scale(1.02)';
      }
    });
    
    item.addEventListener('mouseleave', function() {
      if (!this.classList.contains('active')) {
        this.style.transform = '';
      }
    });
  });
  
  mobileNavItems.forEach(item => {
    item.addEventListener('click', function() {
      const sectionId = this.dataset.section;
      setActiveSection(sectionId);
      createPulseEffect(this);
    });
    
    item.addEventListener('touchstart', function() {
      this.style.transform = 'scale(0.95)';
    });
    
    item.addEventListener('touchend', function() {
      setTimeout(() => {
        this.style.transform = '';
      }, 120);
    });
  });
  
  const savedSection = localStorage.getItem('activeSection');
  if (savedSection) {
    setActiveSection(savedSection);
  } else {
    setActiveSection('dashboard');
  }
  
  function createRippleEffect(element) {
    const ripple = document.createElement('div');
    ripple.className = 'nav-ripple';
    ripple.style.cssText = `
      position: absolute;
      border-radius: 50%;
      background: rgba(0, 245, 255, 0.4);
      transform: scale(0);
      animation: navRipple 0.5s ease-out;
      left: 50%;
      top: 50%;
      width: 16px;
      height: 16px;
      margin-left: -8px;
      margin-top: -8px;
      pointer-events: none;
    `;
    
    element.style.position = 'relative';
    element.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 500);
  }
  
  function createPulseEffect(element) {
    const pulse = document.createElement('div');
    pulse.className = 'nav-pulse';
    pulse.style.cssText = `
      position: absolute;
      inset: 0;
      border-radius: 12px;
      background: rgba(0, 245, 255, 0.2);
      animation: navPulse 0.3s ease-out;
      pointer-events: none;
    `;
    
    element.style.position = 'relative';
    element.appendChild(pulse);
    
    setTimeout(() => {
      pulse.remove();
    }, 300);
  }
}

// CSS para animaciones
const navStyles = `
  @keyframes navRipple {
    to {
      transform: scale(3);
      opacity: 0;
    }
  }
  
  @keyframes navPulse {
    0% {
      transform: scale(1);
      opacity: 0.5;
    }
    100% {
      transform: scale(1.1);
      opacity: 0;
    }
  }
  
  .nav-item {
    transition: transform 0.2s ease;
  }
  
  .mobile-nav-item {
    transition: transform 0.15s ease;
  }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = navStyles;
document.head.appendChild(styleSheet);

window.setActiveSection = function(sectionId) {
  const event = new CustomEvent('navigationChange', { detail: { sectionId } });
  document.dispatchEvent(event);
};