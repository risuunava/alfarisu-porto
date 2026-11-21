import './style.css';
import { ParticlePortraitScene } from './three-scene.js';

// Initialize the 3D WebGL Pixel Particle Portrait
const scene = new ParticlePortraitScene('webgl-canvas-container');

// Viewport & Navigation Elements
const viewport = document.getElementById('horizontal-viewport');
const btnScrollBegin = document.getElementById('btn-scroll-begin');
const btnBackHome = document.getElementById('btn-back-home');

let currentPage = 0; // 0 = Hero Landing, 1 = Who I Am, 2 = Projects
let isNavigating = false;

// Unified Smooth Page Slider (3 Pages: Hero, About, Projects)
function goToPage(index) {
  if (index < 0) index = 0;
  if (index > 2) index = 2;

  currentPage = index;
  isNavigating = true;

  // Dismiss project preview immediately when navigating
  if (typeof hidePreview === 'function') {
    hidePreview();
  }

  // Disable pointer events on projects page when not viewing it (prevents bleed)
  const projectsSection = document.getElementById('page-projects');
  if (projectsSection) {
    projectsSection.style.pointerEvents = (currentPage === 2) ? 'auto' : 'none';
  }

  const targetX = currentPage * window.innerWidth;
  viewport.scrollTo({
    left: targetX,
    behavior: 'smooth'
  });

  // Reset vertical scroll on page 1 if leaving it
  if (currentPage === 0) {
    const aboutPage = document.getElementById('page-about');
    if (aboutPage) {
      aboutPage.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Brief lock so a single scroll/swipe gesture doesn't trigger multiple jumps
  setTimeout(() => {
    isNavigating = false;
  }, 650);
}

// 1. CTA Button Triggers
if (btnScrollBegin) {
  btnScrollBegin.addEventListener('click', (e) => {
    e.preventDefault();
    goToPage(1);
  });
}

if (btnBackHome) {
  btnBackHome.addEventListener('click', (e) => {
    e.preventDefault();
    goToPage(0);
  });
}

// 2. Mouse Wheel Navigation (Desktop Mouse & Laptop Trackpad)
let wheelAccumulator = 0;
let wheelCooldownTimer = null;

window.addEventListener('wheel', (e) => {
  const aboutPage = document.getElementById('page-about');
  const hasVerticalScroll = aboutPage && (aboutPage.scrollHeight > aboutPage.clientHeight + 15);

  // If on Page 1 (Who I Am):
  if (currentPage === 1 && hasVerticalScroll) {
    const isAtTop = aboutPage.scrollTop <= 6;
    const isAtBottom = Math.ceil(aboutPage.scrollTop + aboutPage.clientHeight) >= aboutPage.scrollHeight - 12;

    if (e.deltaY < 0) {
      // Scrolling UP
      if (!isAtTop) {
        // Not at top yet: allow natural scroll up, do NOT switch page
        return;
      }
      // Mentok paling atas dan terus scroll up -> kembali ke Page 0 (Hero)
      wheelAccumulator += e.deltaY;
      if (wheelAccumulator < -28) {
        wheelAccumulator = 0;
        goToPage(0);
      }
      return;
    } else if (e.deltaY > 0) {
      // Scrolling DOWN
      if (!isAtBottom) {
        // Not at bottom yet: allow natural scroll down, do NOT switch page
        return;
      }
      // Mentok paling bawah dan terus scroll down -> lanjut ke Page 2 (Projects)!
      wheelAccumulator += e.deltaY;
      if (wheelAccumulator > 28) {
        wheelAccumulator = 0;
        goToPage(2);
      }
      return;
    }
  }

  // If on Page 2 (Projects) and scrolling back up:
  if (currentPage === 2 && e.deltaY < -25) {
    if (isNavigating) return;
    goToPage(1);
    return;
  }

  if (isNavigating) return;

  const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
  wheelAccumulator += delta;

  clearTimeout(wheelCooldownTimer);
  wheelCooldownTimer = setTimeout(() => {
    wheelAccumulator = 0;
  }, 180);

  // Page 0 -> Page 1
  if (wheelAccumulator > 28 && currentPage === 0) {
    wheelAccumulator = 0;
    goToPage(1);
  }
  // Page 1 -> Page 2 (when no vertical scroll or horizontal delta)
  else if (wheelAccumulator > 28 && currentPage === 1) {
    wheelAccumulator = 0;
    goToPage(2);
  }
  // Page 2 -> Page 1
  else if (wheelAccumulator < -28 && currentPage === 2) {
    wheelAccumulator = 0;
    goToPage(1);
  }
  // Page 1 -> Page 0
  else if (wheelAccumulator < -28 && currentPage === 1) {
    wheelAccumulator = 0;
    goToPage(0);
  }
}, { passive: true });

// 3. Touch Screen Swipe Navigation (Mobile & Tablet)
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

window.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
  }
}, { passive: true });

window.addEventListener('touchend', (e) => {
  if (isNavigating || e.changedTouches.length === 0) return;

  const touchEndX = e.changedTouches[0].clientX;
  const touchEndY = e.changedTouches[0].clientY;

  const diffX = touchStartX - touchEndX;
  const diffY = touchStartY - touchEndY;

  const aboutPage = document.getElementById('page-about');
  const hasVerticalScroll = aboutPage && (aboutPage.scrollHeight > aboutPage.clientHeight + 15);

  // 1. Page 0 (Hero):
  if (currentPage === 0) {
    // Swipe UP (diffY > 40) or Swipe LEFT (diffX > 40) -> Go to Page 1
    if (diffY > 40 || diffX > 40) {
      goToPage(1);
    }
    return;
  }

  // 2. Page 1 (Who I Am):
  if (currentPage === 1) {
    if (hasVerticalScroll) {
      const isAtTop = aboutPage.scrollTop <= 8;
      const isAtBottom = Math.ceil(aboutPage.scrollTop + aboutPage.clientHeight) >= aboutPage.scrollHeight - 14;

      // Vertical swipe gesture
      if (Math.abs(diffY) > 35) {
        if (diffY < -35) {
          // Swiped DOWN (user scrolling up)
          // HANYA jika sudah mentok di paling atas, kembali ke Page 0
          if (isAtTop) {
            goToPage(0);
          }
          return;
        } else if (diffY > 35) {
          // Swiped UP (user scrolling down)
          // HANYA jika sudah mentok di paling bawah, lanjut ke Page 2 (Projects)!
          if (isAtBottom) {
            goToPage(2);
          }
          return;
        }
      }

      // Dominant horizontal swipe right to go back to Hero
      if (diffX < -50 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
        if (isAtTop) {
          goToPage(0);
        }
        return;
      }

      // Dominant horizontal swipe left to go forward to Projects
      if (diffX > 50 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
        if (isAtBottom) {
          goToPage(2);
        }
        return;
      }
    } else {
      // If content fits completely on screen without scroll
      if (diffX > 40 || diffY > 40) {
        goToPage(2);
      } else if (diffX < -40 || diffY < -40) {
        goToPage(0);
      }
    }
    return;
  }

  // 3. Page 2 (Projects):
  if (currentPage === 2) {
    // Swiped RIGHT or Swiped DOWN -> Go back to Page 1 (Who I Am)
    if (diffX < -40 || diffY < -45) {
      goToPage(1);
    }
  }
}, { passive: true });

// 4. Keyboard Arrow Navigation
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
    goToPage(currentPage + 1);
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
    goToPage(currentPage - 1);
  }
});

// 5. Sync Scroll Position with 3D Scene in Real Time
if (viewport) {
  viewport.addEventListener('scroll', () => {
    const maxScroll = viewport.scrollWidth - viewport.clientWidth;
    const progress = maxScroll > 0 ? viewport.scrollLeft / maxScroll : 0;
    scene.setHorizontalScroll(progress);

    // Keep currentPage state accurate if user scrolls natively
    currentPage = Math.round(viewport.scrollLeft / window.innerWidth);

    // Hide project preview when not fully on Projects page (prevents bug on Page 2)
    if (currentPage !== 2) {
      hidePreview();
    }

    // Toggle pointer-events on projects page to completely prevent bleed onto Page 2
    const projectsSection = document.getElementById('page-projects');
    if (projectsSection) {
      projectsSection.style.pointerEvents = (currentPage === 2) ? 'auto' : 'none';
    }
  }, { passive: true });
}

// 6. 1-Click Copy Email Action
const btnCopyEmail = document.getElementById('btn-copy-email');
const copyText = document.getElementById('copy-text');

if (btnCopyEmail) {
  btnCopyEmail.addEventListener('click', () => {
    navigator.clipboard.writeText('risuunava@gmail.com').then(() => {
      if (copyText) {
        copyText.textContent = 'Copied to clipboard!';
        btnCopyEmail.style.borderColor = '#00ff88';
        btnCopyEmail.style.color = '#00ff88';

        setTimeout(() => {
          copyText.textContent = 'Click to copy';
          btnCopyEmail.style.borderColor = 'rgba(255, 255, 255, 0.15)';
          btnCopyEmail.style.color = 'rgba(255, 255, 255, 0.85)';
        }, 2200);
      }
    });
  });
}

// 7. Aceternity Glowing Effect Demo Mouse Tracking
const glowingCards = document.querySelectorAll('.glowing-card-wrapper');
window.addEventListener('mousemove', (e) => {
  glowingCards.forEach((card) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check proximity (activate glow when cursor is within 80px)
    const proximity = 80;
    if (
      e.clientX >= rect.left - proximity &&
      e.clientX <= rect.right + proximity &&
      e.clientY >= rect.top - proximity &&
      e.clientY <= rect.bottom + proximity
    ) {
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
      card.querySelector('.glow-border').style.opacity = '1';
      card.querySelector('.glow-blur').style.opacity = '1';
    } else {
      card.querySelector('.glow-border').style.opacity = '0';
      card.querySelector('.glow-blur').style.opacity = '0';
    }
  });
});

// 8. Interactive Project Card Click to Open
const projCards = document.querySelectorAll('.proj-card');
projCards.forEach((card) => {
  card.addEventListener('click', () => {
    const url = card.getAttribute('data-url');
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  });
});

// 10. 3D Floating Preview Card on Project Hover
const pvOverlay = document.getElementById('proj-preview-overlay');
const pvCard = document.getElementById('proj-preview-card');
const pvBadge = document.getElementById('pv-badge');
const pvName = document.getElementById('pv-name');
const pvDesc = document.getElementById('pv-desc');
const pvTags = document.getElementById('pv-tags');
const pvActions = document.getElementById('pv-actions');
const pvArrow = document.getElementById('pv-arrow');

let pvHideTimer = null;
let pvVisible = false;
let pvMouseX = window.innerWidth / 2;
let pvMouseY = window.innerHeight / 2;
let pvCardX = window.innerWidth / 2;
let pvCardY = window.innerHeight / 2;
let pvAnimFrame = null;

/* Position card: keep it inside viewport */
function positionPreview(mx, my) {
  if (!pvCard) return;
  const W = pvCard.offsetWidth || 310;
  const H = pvCard.offsetHeight || 300;
  const pad = 20;

  let tx = mx + 40;
  let ty = my - H / 2;

  // Clamp inside viewport
  if (tx + W + pad > window.innerWidth) tx = mx - W - 40;
  if (tx < pad) tx = pad;
  if (ty < pad) ty = pad;
  if (ty + H + pad > window.innerHeight) ty = window.innerHeight - H - pad;

  pvCard.style.left = `${tx}px`;
  pvCard.style.top = `${ty}px`;
}

/* Smooth magnetic follow loop */
function tickPreview() {
  if (!pvVisible || currentPage !== 2) {
    hidePreview();
    return;
  }
  pvCardX += (pvMouseX - pvCardX) * 0.12;
  pvCardY += (pvMouseY - pvCardY) * 0.12;
  positionPreview(pvCardX, pvCardY);
  pvAnimFrame = requestAnimationFrame(tickPreview);
}

/* 3D tilt based on mouse relative to card */
function applyTilt(e) {
  if (!pvCard || !pvVisible || currentPage !== 2) return;
  const rect = pvCard.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = (e.clientX - cx) / (rect.width / 2); // -1..1
  const dy = (e.clientY - cy) / (rect.height / 2); // -1..1
  const rotY = dx * 14;
  const rotX = -dy * 10;
  pvCard.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1) translateY(0px)`;
}

/* Collect data from hovered marquee card */
function getCardData(card) {
  const badge = card.querySelector('.proj-badge')?.textContent.trim() || '';
  const name = card.querySelector('.proj-name')?.textContent.trim() || '';
  const desc = card.querySelector('.proj-desc')?.textContent.trim() || '';
  const tags = [...card.querySelectorAll('.proj-tag')].map(t => t.textContent.trim());
  const srcBtns = [...card.querySelectorAll('.proj-card-actions a')];
  return { badge, name, desc, tags, srcBtns };
}

function showPreview(card, e) {
  // CRITICAL: Only allow preview when user is actually on Page 3 (Projects, index 2)
  if (currentPage !== 2) {
    hidePreview();
    return;
  }

  clearTimeout(pvHideTimer);
  const { badge, name, desc, tags, srcBtns } = getCardData(card);

  // Populate — same exact elements as proj-card
  pvBadge.textContent = badge;
  pvName.textContent = name;
  pvDesc.textContent = desc;
  pvTags.innerHTML = tags.map(t => `<span class="proj-tag">${t}</span>`).join('');

  pvActions.innerHTML = '';
  srcBtns.forEach(a => {
    const btn = document.createElement('a');
    btn.href = a.href;
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
    btn.textContent = a.textContent.trim();
    btn.className = `proj-btn ${a.classList.contains('proj-btn-primary') ? 'proj-btn-primary' : 'proj-btn-ghost'}`;
    btn.addEventListener('click', ev => ev.stopPropagation());
    pvActions.appendChild(btn);
  });

  // Snap card to initial cursor position
  pvCardX = e.clientX;
  pvCardY = e.clientY;
  positionPreview(pvCardX, pvCardY);

  pvCard.classList.add('is-visible');
  pvVisible = true;

  cancelAnimationFrame(pvAnimFrame);
  pvAnimFrame = requestAnimationFrame(tickPreview);
}

function hidePreview() {
  pvHideTimer = setTimeout(() => {
    pvCard.classList.remove('is-visible');
    pvVisible = false;
    cancelAnimationFrame(pvAnimFrame);
    pvCard.style.transform = `perspective(900px) rotateX(0deg) rotateY(0deg) scale(0.84) translateY(20px)`;
  }, 90);
}

/* Project card hover: pure CSS translateY lift without resizing */

// Initial state: ensure projects section does not capture pointer events unless on Page 2
const initialProjectsSection = document.getElementById('page-projects');
if (initialProjectsSection) {
  initialProjectsSection.style.pointerEvents = (currentPage === 2) ? 'auto' : 'none';
}

// 9. Pixel Particles Emitter on Hover for Download CV Button
const cvBtn = document.getElementById('btn-download-cv');
if (cvBtn) {
  const pixelColors = ['#00f0ff', '#ff0077', '#00ff88', '#ffe600', '#ffffff', '#a855f7'];

  cvBtn.addEventListener('mouseenter', () => {
    const rect = cvBtn.getBoundingClientRect();
    for (let i = 0; i < 16; i++) {
      const p = document.createElement('span');
      p.className = 'cv-pixel-particle';
      const size = Math.random() > 0.5 ? 4 : 3;
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.backgroundColor = pixelColors[Math.floor(Math.random() * pixelColors.length)];
      p.style.left = `${Math.random() * rect.width}px`;
      p.style.top = `${Math.random() * rect.height}px`;

      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 35;
      p.style.setProperty('--vx', `${Math.cos(angle) * speed}px`);
      p.style.setProperty('--vy', `${Math.sin(angle) * speed}px`);

      cvBtn.appendChild(p);
      setTimeout(() => p.remove(), 650);
    }
  });

  // Direct Download of both CV (ID) & Resume (EN) on click
  cvBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (cvBtn.dataset.downloading) return;
    cvBtn.dataset.downloading = 'true';

    const label = cvBtn.querySelector('.pixel-cv-label');
    const originalText = label ? label.textContent : 'Download CV';
    if (label) label.textContent = 'Downloading...';

    const triggerDownload = (url, filename) => {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };

    // 1. Download cv.alfarisi.pdf (Bahasa Indonesia)
    triggerDownload('/cv.alfarisi.pdf', 'cv.alfarisi.pdf');

    // 2. Download resume.alfarisi.pdf (English) with slight delay for browser handling
    setTimeout(() => {
      triggerDownload('/resume.alfarisi.pdf', 'resume.alfarisi.pdf');
    }, 280);

    setTimeout(() => {
      if (label) label.textContent = 'Downloaded!';
    }, 650);

    setTimeout(() => {
      if (label) label.textContent = originalText;
      delete cvBtn.dataset.downloading;
    }, 2200);
  });
}

// Adjust on window resize
window.addEventListener('resize', () => {
  viewport.scrollTo({
    left: currentPage * window.innerWidth,
    behavior: 'auto'
  });
});

// 11. Aceternity Animated Tooltip Demo (Spring Tilt & Mouse Tracking)
const tooltipItems = document.querySelectorAll('.animated-tooltip-item');
tooltipItems.forEach((item) => {
  const popup = item.querySelector('.animated-tooltip-popup');
  const avatar = item.querySelector('.animated-tooltip-avatar');
  if (!popup || !avatar) return;

  item.addEventListener('mousemove', (e) => {
    const rect = avatar.getBoundingClientRect();
    const halfWidth = rect.width / 2;
    const deltaX = (e.clientX - rect.left) - halfWidth;

    // Signature Aceternity tilt & horizontal shift
    const rot = (deltaX / halfWidth) * 22; // max ±22deg
    const tx = (deltaX / halfWidth) * 18;  // max ±18px

    popup.style.setProperty('--rot', `${rot}deg`);
    popup.style.setProperty('--tx', `${tx}px`);
  });

  item.addEventListener('mouseleave', () => {
    popup.style.setProperty('--rot', '0deg');
    popup.style.setProperty('--tx', '0px');
  });
});
