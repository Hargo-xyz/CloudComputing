// ==========================================
// OPTIMIZED JAVASCRIPT FOR MOBILE PERFORMANCE
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  // --- 1. OPTIMASI: Cache Element DOM ---
  // Jangan pernah melakukan querySelector di dalam event scroll
  const focusContainer = document.getElementById("focus-container");
  const focusBox = document.getElementById("focus-box");
  const focusTargets = document.querySelectorAll(".focus-target");
  
  const timelineContainer = document.getElementById("timeline-container");
  const scrollLine = document.getElementById("scroll-line");
  const cloudMarker = document.getElementById("cloud-marker");
  const navbar = document.getElementById("navbar");
  
  // Cache semua elemen timeline dan child-nya sekali di awal
  const timelineStepsData = Array.from(document.querySelectorAll(".timeline-step")).map(step => ({
    element: step,
    badge: step.querySelector(".step-badge"),
    card: step.querySelector(".timeline-card"),
    sideGraphic: step.querySelector(".side-graphic"),
    connector: step.querySelector(".connector-line"),
    dir: step.querySelector(".side-graphic")?.getAttribute("data-dir")
  }));

  let currentIndex = 0;

  // --- 2. FOCUS ANIMATION ---
  function updateFocus() {
    if (!focusContainer || !focusBox || focusTargets.length === 0) return;
    
    // Gunakan requestAnimationFrame agar animasi sinkron dengan refresh rate layar HP
    requestAnimationFrame(() => {
      focusBox.style.opacity = "0";

      setTimeout(() => {
        requestAnimationFrame(() => {
          focusTargets.forEach((target, index) => {
            if (index === currentIndex) {
              target.style.filter = "blur(0px)";
              target.style.opacity = "1";
            } else {
              target.style.filter = "blur(4px)";
              target.style.opacity = "0.35";
            }
          });

          const target = focusTargets[currentIndex];
          const containerRect = focusContainer.getBoundingClientRect();
          const targetRect = target.getBoundingClientRect();

          const top = targetRect.top - containerRect.top;
          const left = targetRect.left - containerRect.left;

          // Gunakan transform 3D untuk memaksa GPU rendering di HP
          focusBox.style.transform = `translate3d(${left - 6}px, ${top - 4}px, 0)`;
          focusBox.style.width = `${targetRect.width + 12}px`;
          focusBox.style.height = `${targetRect.height + 8}px`;
          focusBox.style.opacity = "1";

          currentIndex = (currentIndex + 1) % focusTargets.length;
        });
      }, 350);
    });
  }

  setTimeout(updateFocus, 500);
  setInterval(updateFocus, 3250);

  // --- 3. OPTIMASI SPOTLIGHT: Hanya jalan di perangkat dengan Mouse (Bukan Layar Sentuh) ---
  if (window.matchMedia("(pointer: fine)").matches) {
    const spotlightCards = document.querySelectorAll(".spotlight-card");
    spotlightCards.forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        requestAnimationFrame(() => {
          const rect = card.getBoundingClientRect();
          card.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
          card.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
        });
      });
    });
  }

  // --- 4. OPTIMASI EVENT SCROLL (Menggabungkan semua fungsi scroll & menggunakan Throttling/rAF) ---
  let isScrolling = false;

  window.addEventListener('scroll', () => {
    if (!isScrolling) {
      window.requestAnimationFrame(() => {
        handleScroll();
        isScrolling = false;
      });
      isScrolling = true;
    }
  }, { passive: true }); // passive: true membantu performa scrolling di HP

  function handleScroll() {
    const windowY = window.scrollY;

    // A. Navbar Animasi
    if (navbar) {
      if (windowY > 50) {
        navbar.classList.add("bg-[#050811]/90", "backdrop-blur-lg", "shadow-lg");
        navbar.classList.remove("sm:mt-4", "sm:bg-white/5");
      } else {
        navbar.classList.remove("bg-[#050811]/90", "backdrop-blur-lg", "shadow-lg");
        navbar.classList.add("sm:mt-4", "sm:bg-white/5");
      }
    }

    // B. Timeline Scroll Line & Card Highlight (Digabung jadi satu)
    if (timelineContainer && scrollLine && cloudMarker) {
      const rect = timelineContainer.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const startPoint = windowHeight * 0.5;
      
      const totalHeight = rect.height;
      const currentScroll = startPoint - rect.top;

      let progress = Math.max(0, Math.min(1, currentScroll / totalHeight));
      const calculatedHeight = progress * totalHeight;

      scrollLine.style.height = `${calculatedHeight}px`;
      
      // Pakai translate3d agar lebih mulus dibanding mengubah properti 'top'
      cloudMarker.style.transform = `translate3d(0, ${calculatedHeight}px, 0)`;
      cloudMarker.style.opacity = (progress > 0.01 && progress < 0.99) ? '1' : '0';

      // C. Highlight Logic menggunakan data yang sudah di-cache
      timelineStepsData.forEach(data => {
        // Membaca offsetTop lebih cepat daripada getBoundingClientRect
        const stepTop = data.element.offsetTop;
        const isActive = calculatedHeight >= (stepTop - 10);

        // Jika statenya sama (sudah aktif dan masih aktif), lewati manipulasi DOM (Hemat Performa)
        if (data.isActive === isActive) return; 
        data.isActive = isActive;

        if (isActive) {
          data.badge.classList.remove('border-slate-700', 'text-slate-400', 'bg-[#0b1329]');
          data.badge.classList.add('border-blue-400', 'text-blue-400', 'bg-blue-500/20', 'shadow-[0_0_15px_rgba(59,130,246,0.6)]');

          data.card.classList.remove('border-slate-800', 'bg-[#0b1329]/80');
          data.card.classList.add('border-blue-500/50', 'bg-[#0b1329]/95', 'shadow-[0_0_30px_rgba(59,130,246,0.15)]', 'scale-[1.02]');

          if (data.connector) {
            data.connector.classList.remove('text-slate-700', 'opacity-30');
            data.connector.classList.add('text-blue-400', 'opacity-100', 'drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]');
          }
          if (data.sideGraphic) {
            data.sideGraphic.classList.remove('opacity-0', 'scale-90', 'text-slate-600', data.dir === 'right' ? 'translate-x-24' : '-translate-x-24');
            data.sideGraphic.classList.add('opacity-80', 'scale-100', 'text-blue-400', 'translate-x-0', 'drop-shadow-[0_0_20px_rgba(59,130,246,0.4)]');
          }
        } else {
          data.badge.classList.add('border-slate-700', 'text-slate-400', 'bg-[#0b1329]');
          data.badge.classList.remove('border-blue-400', 'text-blue-400', 'bg-blue-500/20', 'shadow-[0_0_15px_rgba(59,130,246,0.6)]');

          data.card.classList.add('border-slate-800', 'bg-[#0b1329]/80');
          data.card.classList.remove('border-blue-500/50', 'bg-[#0b1329]/95', 'shadow-[0_0_30px_rgba(59,130,246,0.15)]', 'scale-[1.02]');

          if (data.connector) {
            data.connector.classList.add('text-slate-700', 'opacity-30');
            data.connector.classList.remove('text-blue-400', 'opacity-100', 'drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]');
          }
          if (data.sideGraphic) {
            data.sideGraphic.classList.add('opacity-0', 'scale-90', 'text-slate-600', data.dir === 'right' ? 'translate-x-24' : '-translate-x-24');
            data.sideGraphic.classList.remove('opacity-80', 'scale-100', 'text-blue-400', 'translate-x-0', 'drop-shadow-[0_0_20px_rgba(59,130,246,0.4)]');
          }
        }
      });
    }
  }

  // --- 5. TAB SWITCHER ---
  // Fungsi dipindah ke global agar bisa dipanggil dari HTML (onclick="switchTab(...)")
  window.switchTab = function(type) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.className = "tab-btn px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 text-gray-400 hover:text-white";
    });
    document.getElementById(`content-${type}`).classList.remove('hidden');
    document.getElementById(`tab-${type}`).className = "tab-btn px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 bg-blue-600 text-white shadow-lg shadow-blue-500/25";
  };

  // --- 6. TERMINAL TYPING EFFECT ---
  const terminalScreen = document.getElementById("terminal-screen");
  if (terminalScreen) {
    const lines = [
      { text: "admin@cloud:~$ ./sistem-deploy.sh", color: "text-blue-400", type: "typing", delay: 500 },
      { text: "Menghubungkan ke pusat data... [SELESAI]", color: "text-slate-300", type: "instant", delay: 800 },
      { text: "Mengatur jaringan global... [SELESAI]", color: "text-slate-300", type: "instant", delay: 600 },
      { text: "Mendistribusikan aplikasi... Proses", color: "text-yellow-400", type: "instant", delay: 1000 },
      { text: "# Server siap digunakan dalam 1.2 detik", color: "text-green-400 font-bold mt-4", type: "instant", delay: 500 },
      { text: "admin@cloud:~$ ", color: "text-blue-400 mt-2", type: "prompt", delay: 0 }
    ];

    let currentLineIndex = 0;

    async function typeLine() {
      if (currentLineIndex >= lines.length) return;

      const line = lines[currentLineIndex];
      const p = document.createElement("div");
      p.className = `${line.color} flex`;
      terminalScreen.appendChild(p);

      await new Promise(r => setTimeout(r, line.delay));

      if (line.type === "typing") {
        for (let i = 0; i <= line.text.length; i++) {
          p.innerHTML = line.text.substring(0, i) + '<span class="animate-terminal-blink">_</span>';
          if (i < line.text.length) {
            await new Promise(r => setTimeout(r, 20)); // Dipercepat sedikit agar lebih smooth
          }
        }
        p.innerHTML = line.text;
      } else if (line.type === "instant") {
        p.innerHTML = line.text;
      } else if (line.type === "prompt") {
        p.innerHTML = `${line.text}<span class="animate-terminal-blink font-bold">_</span>`;
      }

      currentLineIndex++;
      // Pakai rAF untuk memanggil fungsi berikutnya tanpa memberatkan main thread
      requestAnimationFrame(typeLine);
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        typeLine();
        observer.disconnect(); 
      }
    }, { threshold: 0.3 }); // Turunkan treshold agar lebih cepat terdeteksi di HP layar kecil

    const terminalSection = document.getElementById("apa-itu-cloud");
    if (terminalSection) observer.observe(terminalSection);
  }

  // --- 7. CAROUSEL ---
  const cards = document.querySelectorAll('.carousel-card');
  const btnNext = document.getElementById('btn-next');
  const btnPrev = document.getElementById('btn-prev');
  const dotsContainer = document.getElementById('carousel-dots');
  
  if (cards.length > 0) {
    let currentCarouselIndex = 0;
    let autoPlayInterval;

    cards.forEach((_, i) => {
      const dot = document.createElement('div');
      dot.className = `w-2 h-2 rounded-full cursor-pointer transition-all duration-300 ${i === 0 ? 'bg-blue-500 w-6' : 'bg-slate-700'}`;
      dot.addEventListener('click', () => {
        currentCarouselIndex = i;
        updateCarousel();
        resetAutoPlay();
      });
      dotsContainer.appendChild(dot);
    });
    const dots = dotsContainer.children;

    function updateCarousel() {
      const total = cards.length;
      requestAnimationFrame(() => {
        cards.forEach((card, index) => {
          card.className = "carousel-card absolute w-full max-w-sm bg-[#0b1221]/80 backdrop-blur-xl border border-slate-700/60 rounded-xl p-8 transform-gpu cursor-pointer shadow-2xl transition-all duration-500";
          
          if (index === currentCarouselIndex) {
            card.classList.add('z-20', 'scale-100', 'opacity-100', 'border-blue-500/50', 'shadow-[0_0_40px_rgba(59,130,246,0.1)]');
            card.style.transform = 'translate3d(0, 0, 0)';
          } else if (index === (currentCarouselIndex - 1 + total) % total) {
            card.classList.add('z-10', 'opacity-40', 'blur-[1px]');
            card.style.transform = 'translate3d(-65%, 0, -100px) scale(0.85)';
          } else if (index === (currentCarouselIndex + 1) % total) {
            card.classList.add('z-10', 'opacity-40', 'blur-[1px]');
            card.style.transform = 'translate3d(65%, 0, -100px) scale(0.85)';
          } else {
            card.classList.add('z-0', 'opacity-0');
            card.style.transform = 'translate3d(0, 0, -200px) scale(0.7)';
          }
        });

        Array.from(dots).forEach((dot, i) => {
          dot.className = i === currentCarouselIndex 
            ? 'w-6 h-2 rounded-full cursor-pointer transition-all duration-300 bg-blue-500' 
            : 'w-2 h-2 rounded-full cursor-pointer transition-all duration-300 bg-slate-700';
        });
      });
    }

    function nextSlide() {
      currentCarouselIndex = (currentCarouselIndex + 1) % cards.length;
      updateCarousel();
    }

    function prevSlide() {
      currentCarouselIndex = (currentCarouselIndex - 1 + cards.length) % cards.length;
      updateCarousel();
    }

    function resetAutoPlay() {
      clearInterval(autoPlayInterval);
      autoPlayInterval = setInterval(nextSlide, 4000);
    }

    if (btnNext) btnNext.addEventListener('click', () => { nextSlide(); resetAutoPlay(); });
    if (btnPrev) btnPrev.addEventListener('click', () => { prevSlide(); resetAutoPlay(); });
    
    cards.forEach((card, index) => {
      card.addEventListener('click', () => {
        if (currentCarouselIndex !== index) {
          currentCarouselIndex = index;
          updateCarousel();
          resetAutoPlay();
        }
      });
    });

    updateCarousel();
    resetAutoPlay();
  }

  // --- 8. MOBILE MENU ---
  const mobileBtn = document.getElementById("mobile-menu-btn");
  const mobileMenu = document.getElementById("mobile-menu");

  if (mobileBtn && mobileMenu) {
    mobileBtn.addEventListener("click", () => {
      mobileMenu.classList.toggle("open");
    });

    mobileMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        mobileMenu.classList.remove("open");
      });
    });
  }
});