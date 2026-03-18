// ============================================
// Mantle Ark AI — Particle Background System
// ============================================

(function () {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width, height;
  let particles = [];
  let connections = [];
  let mouse = { x: -1000, y: -1000 };
  let animFrame;

  const CONFIG = {
    particleCount: 60,
    maxSpeed: 0.3,
    minSize: 1,
    maxSize: 2.5,
    connectionDistance: 150,
    mouseDistance: 200,
    colors: [
      'rgba(0, 212, 170, 0.6)',
      'rgba(123, 97, 255, 0.5)',
      'rgba(59, 130, 246, 0.4)',
      'rgba(6, 182, 212, 0.4)',
    ]
  };

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function createParticle() {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * CONFIG.maxSpeed,
      vy: (Math.random() - 0.5) * CONFIG.maxSpeed,
      size: CONFIG.minSize + Math.random() * (CONFIG.maxSize - CONFIG.minSize),
      color: CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)],
      alpha: 0.2 + Math.random() * 0.5,
      pulseSpeed: 0.005 + Math.random() * 0.01,
      pulsePhase: Math.random() * Math.PI * 2,
    };
  }

  function init() {
    resize();
    particles = [];
    for (let i = 0; i < CONFIG.particleCount; i++) {
      particles.push(createParticle());
    }
  }

  function updateParticle(p) {
    p.x += p.vx;
    p.y += p.vy;

    // Wrap around
    if (p.x < -10) p.x = width + 10;
    if (p.x > width + 10) p.x = -10;
    if (p.y < -10) p.y = height + 10;
    if (p.y > height + 10) p.y = -10;

    // Pulse
    p.pulsePhase += p.pulseSpeed;
    p.currentAlpha = p.alpha + Math.sin(p.pulsePhase) * 0.15;

    // Mouse repel
    const dx = p.x - mouse.x;
    const dy = p.y - mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < CONFIG.mouseDistance) {
      const force = (CONFIG.mouseDistance - dist) / CONFIG.mouseDistance * 0.02;
      p.vx += (dx / dist) * force;
      p.vy += (dy / dist) * force;
    }

    // Speed limit
    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    if (speed > CONFIG.maxSpeed * 2) {
      p.vx *= 0.98;
      p.vy *= 0.98;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONFIG.connectionDistance) {
          const alpha = (1 - dist / CONFIG.connectionDistance) * 0.12;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0, 212, 170, ${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    // Draw particles
    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color.replace(/[\d.]+\)$/, `${p.currentAlpha})`);
      ctx.fill();

      // Glow effect
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
      ctx.fillStyle = p.color.replace(/[\d.]+\)$/, `${p.currentAlpha * 0.1})`);
      ctx.fill();
    }
  }

  function animate() {
    particles.forEach(updateParticle);
    draw();
    animFrame = requestAnimationFrame(animate);
  }

  // Event listeners
  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  // Start
  init();
  animate();
})();
