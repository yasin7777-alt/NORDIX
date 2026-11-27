// NORDIX original client behavior, preserved during gradual React migration.
// Initialize Lucide Icons
    lucide.createIcons();

    // Courses Data
    const coursesData = [{"id": 1, "category": "ai", "tag": "ХОЛОД", "duration": "Учебный модуль", "level": "Базовый", "title": "Основы холодильного цикла", "desc": "Компрессор, конденсатор, дросселирующее устройство и испаритель. Разбираем, куда уходит тепло и почему в камере становится холодно.", "dark": true}, {"id": 2, "category": "ai", "tag": "КОМПРЕССОРЫ", "duration": "Учебный модуль", "level": "Базовый", "title": "Компрессоры и агрегаты", "desc": "Назначение, основные узлы и рабочие параметры. Учимся понимать агрегат, а не просто слушать, как он гудит.", "dark": false}, {"id": 3, "category": "dev", "tag": "ЭЛЕКТРИКА", "duration": "Учебный модуль", "level": "Базовый", "title": "Электросхемы и электропривод", "desc": "Электродвигатели, контакторы, реле и цепи управления. Читаем схему и разбираемся, кто за что отвечает.", "dark": false}, {"id": 4, "category": "dev", "tag": "АВТОМАТИКА", "duration": "Учебный модуль", "level": "Базовый", "title": "Управление и защита", "desc": "Датчики температуры и давления, контроллеры и защитные устройства. Разбираем логику работы — без обхода защит.", "dark": false}, {"id": 5, "category": "design", "tag": "МОНТАЖ", "duration": "Учебный модуль", "level": "Базовый", "title": "Монтаж оборудования", "desc": "Крепления, трубопроводы, соединения и организация рабочего места. Собираем понимание процесса: аккуратно, по документации, без «и так сойдёт».", "dark": false}, {"id": 6, "category": "design", "tag": "ДИАГНОСТИКА", "duration": "Учебный модуль", "level": "Базовый", "title": "Обслуживание и поиск неисправностей", "desc": "Учебные разборы: камера не держит холод, агрегат шумит, срабатывает защита. Ищем причину по признакам, а не меняем всё подряд.", "dark": false}];

    const coursesGrid = document.getElementById('courses-grid');
    const academyCourseUrl = coursesGrid.dataset.academyUrl;
    if (academyCourseUrl) {
      coursesData[0].title = 'База холодильной техники';
      coursesData[0].duration = '10 уроков';
      coursesData[0].desc = 'От технических терминов до полного холодильного цикла: теория, видео, виртуальная практика и викторины.';
    }
    function openCourseCard(id, title) {
      if (id === 1 && academyCourseUrl) window.location.assign(academyCourseUrl);
      else openEnrollModal('Модуль: ' + title);
    }

    function renderCourses(filter = 'all') {
      coursesGrid.style.opacity = '0';
      coursesGrid.style.transform = 'translateY(16px)';

      setTimeout(() => {
        const filtered = filter === 'all' ? coursesData : coursesData.filter(c => c.category === filter);
        coursesGrid.innerHTML = filtered.map(c => `
          <article class="course-card rounded-[2rem] p-8 sm:p-9 flex flex-col justify-between border ${
            c.dark 
              ? 'bg-n900 text-n0 border-n800' 
              : 'bg-n0 text-n900 border-n500 hover:border-accent'
          }">
            <div>
              <div class="flex items-center justify-between gap-3 mb-8">
                <span class="px-3.5 py-1.5 rounded-full text-xs font-display font-bold uppercase tracking-wider ${
                  c.dark ? 'bg-semantic text-n0' : 'bg-n300 text-accent'
                }">
                  ${c.tag}
                </span>
                <span class="text-xs font-bold ${c.dark ? 'text-n500' : 'text-n700'}">
                  ${c.duration} • ${c.level}
                </span>
              </div>
              <h3 class="font-display font-bold text-2xl sm:text-3xl leading-tight mb-4">
                ${c.title}
              </h3>
              <p class="text-base leading-relaxed ${c.dark ? 'text-n500' : 'text-n700'}">
                ${c.desc}
              </p>
            </div>

            <div class="mt-10 pt-6 border-t ${c.dark ? 'border-n800' : 'border-n400'} flex items-center justify-between">
              <button onclick="openCourseCard(${c.id}, '${c.title}')" class="font-display font-bold text-xs uppercase tracking-wider flex items-center gap-2 ${
                c.dark ? 'text-semantic hover:text-n0' : 'text-n900 hover:text-accent'
              } transition-colors">
                <span>${c.id === 1 && academyCourseUrl ? 'Начать обучение' : 'Программа курса'}</span>
                <i data-lucide="arrow-up-right" class="w-4 h-4"></i>
              </button>
              <button onclick="openCourseCard(${c.id}, '${c.title}')" aria-label="${c.id === 1 && academyCourseUrl ? 'Начать курс' : 'Записаться'}" class="w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                c.dark ? 'bg-n800 hover:bg-accent text-n0' : 'bg-n300 hover:bg-accent hover:text-n0 text-n900'
              }">
                <i data-lucide="plus" class="w-5 h-5"></i>
              </button>
            </div>
          </article>
        `).join('');

        lucide.createIcons();
        coursesGrid.style.opacity = '1';
        coursesGrid.style.transform = 'translateY(0)';
      }, 220);
    }

    renderCourses('all');

    // Filter Buttons Click
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => {
          b.classList.remove('bg-n900', 'text-n0');
          b.classList.add('text-n800');
        });
        btn.classList.add('bg-n900', 'text-n0');
        btn.classList.remove('text-n800');
        renderCourses(btn.dataset.filter);
      });
    });

    // Переходы между разделами: стандартная плавная прокрутка к якорям.
    // Чёрная заставка и задержки полностью удалены.

    // Mobile Menu Toggle
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    let menuOpen = false;

    function closeMobileMenu() {
      menuOpen = false;
      mobileMenu.classList.add('translate-x-full');
      mobileBtn.innerHTML = '<i data-lucide="menu" class="w-6 h-6"></i>';
      lucide.createIcons();
    }

    mobileBtn.addEventListener('click', () => {
      menuOpen = !menuOpen;
      if (menuOpen) {
        mobileMenu.classList.remove('translate-x-full');
        mobileBtn.innerHTML = '<i data-lucide="x" class="w-6 h-6"></i>';
      } else {
        mobileMenu.classList.add('translate-x-full');
        mobileBtn.innerHTML = '<i data-lucide="menu" class="w-6 h-6"></i>';
      }
      lucide.createIcons();
    });

    document.querySelectorAll('.mobile-link').forEach(l => {
      l.addEventListener('click', () => closeMobileMenu());
    });

    // Intersection Observer for Reveal Animations & Number Counters
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.14 });

    document.querySelectorAll('.reveal-up, .reveal-scale').forEach(el => revealObserver.observe(el));

    const counterObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.dataset.target, 10);
          const suffix = el.dataset.suffix || '';
          let current = 0;
          const step = Math.max(1, Math.ceil(target / 40));
          const timer = setInterval(() => {
            current += step;
            if (current >= target) {
              current = target;
              clearInterval(timer);
            }
            el.textContent = current + suffix;
          }, 28);
          obs.unobserve(el);
        }
      });
    }, { threshold: 0.5 });

    document.querySelectorAll('.counter').forEach(c => counterObserver.observe(c));

    // The trajectory calculator was replaced by a passive looping video.\n\n    // Accessible NORDIX accordion with animated rotating arrows.
    const faqItems = Array.from(document.querySelectorAll('#faq .accordion-item'));
    const toggleFaq = (item) => {
      const expand = !item.classList.contains('open');
      faqItems.forEach((entry) => {
        const opened = expand && entry === item;
        entry.classList.toggle('open', opened);
        entry.setAttribute('aria-expanded', String(opened));
        const answer = entry.querySelector('.accordion-content');
        if (answer) answer.setAttribute('aria-hidden', String(!opened));
      });
    };
    faqItems.forEach((item) => {
      item.addEventListener('click', () => toggleFaq(item));
      item.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggleFaq(item);
        }
      });
    });

    // Subtle 3D Tilt on Logo Showcase Card
    const tiltCard = document.getElementById('tilt-card');
    if (tiltCard) {
      tiltCard.addEventListener('mousemove', (e) => {
        const rect = tiltCard.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        tiltCard.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
      });
      tiltCard.addEventListener('mouseleave', () => {
        tiltCard.style.transform = 'perspective(900px) rotateY(0deg) rotateX(0deg)';
      });
    }

    // Custom Cursor Follower & Magnetic Buttons
    const cursorDot = document.getElementById('cursor-dot');
    window.addEventListener('mousemove', (e) => {
      cursorDot.style.left = `${e.clientX}px`;
      cursorDot.style.top = `${e.clientY}px`;
    });

    document.querySelectorAll('a, button').forEach(el => {
      el.addEventListener('mouseenter', () => {
        cursorDot.style.width = '42px';
        cursorDot.style.height = '42px';
      });
      el.addEventListener('mouseleave', () => {
        cursorDot.style.width = '14px';
        cursorDot.style.height = '14px';
      });
    });

    // Modals Logic
    const enrollModal = document.getElementById('enroll-modal');
    const enrollDialog = document.getElementById('enroll-dialog');
    const formState = document.getElementById('modal-form-state');
    const successState = document.getElementById('modal-success-state');

    function openEnrollModal(contextTitle) {
      document.getElementById('modal-subtitle').textContent = `Направление: ${contextTitle}`;
      formState.classList.remove('hidden');
      successState.classList.add('hidden');
      enrollModal.classList.remove('hidden');
      enrollModal.classList.add('flex');
      requestAnimationFrame(() => {
        enrollModal.classList.remove('opacity-0');
        enrollDialog.classList.remove('scale-95');
      });
    }

    function closeEnrollModal() {
      enrollModal.classList.add('opacity-0');
      enrollDialog.classList.add('scale-95');
      setTimeout(() => {
        enrollModal.classList.add('hidden');
        enrollModal.classList.remove('flex');
      }, 280);
    }

    document.getElementById('lead-form').addEventListener('submit', (e) => {
      e.preventDefault();
      formState.classList.add('hidden');
      successState.classList.remove('hidden');
      e.target.reset();
    });

    enrollModal.addEventListener('click', (e) => {
      if (e.target === enrollModal) closeEnrollModal();
    });

    // Video Modal Logic
    const videoModal = document.getElementById('video-modal');
    function openVideoModal() {
      videoModal.classList.remove('hidden');
      videoModal.classList.add('flex');
      requestAnimationFrame(() => videoModal.classList.remove('opacity-0'));
    }
    function closeVideoModal() {
      videoModal.classList.add('opacity-0');
      setTimeout(() => {
        videoModal.classList.add('hidden');
        videoModal.classList.remove('flex');
      }, 280);
    }
    videoModal.addEventListener('click', (e) => {
      if (e.target === videoModal) closeVideoModal();
    });
