/* =========================================================
   Гараж 360 — скрипты страницы (кроме 3D-сцены, она в assets/js/hero3d.js)
   Анимации: anime.js v4 (локально, assets/vendor/anime.umd.min.js).
   В UMD-сборке v4 API лежит в глобальном объекте `anime`:
   anime.animate(), anime.createTimeline(), anime.stagger(), anime.onScroll().
   ========================================================= */
(() => {
  'use strict';

  const root = document.documentElement;
  const A = window.anime;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canAnimate = Boolean(A && A.animate) && !reduceMotion;
  if (!canAnimate) root.classList.remove('anim');

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const formatNum = (n) => new Intl.NumberFormat('ru-RU').format(Math.round(n));
  // Кривая «тяжёлого» движения (как в CSS --ease) и пружина для отклика на наведение
  const EASE = canAnimate ? A.cubicBezier(0.32, 0.72, 0, 1) : null;
  const SPRING = canAnimate ? A.spring({ mass: 1, stiffness: 180, damping: 18 }) : null;
  const ICON_GO = '<svg aria-hidden="true"><use href="#i-go"/></svg>';

  /* Проигрывать анимацию, только пока элемент на экране (экономим батарею) */
  function playWhileVisible(el, anims) {
    if (!el || !anims.length) return;
    new IntersectionObserver(([entry]) => {
      anims.forEach((a) => (entry.isIntersecting ? a.play() : a.pause()));
    }).observe(el);
  }

  /* ---------- Мобильное меню ---------- */
  const burger = $('.burger');
  const nav = $('#nav');
  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    // Пункты полноэкранного меню выезжают снизу по очереди
    if (open && canAnimate) {
      A.animate($$('.nav__list li, .nav__cta', nav), {
        opacity: [0, 1], y: [48, 0], duration: 900, ease: EASE, delay: A.stagger(60, { start: 120 }),
      });
    }
  }
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('click', (e) => {
    if (nav.classList.contains('is-open') && !e.target.closest('.header')) setMenu(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); burger.focus(); }
  });
  window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  /* ---------- Ссылки-заглушки, год ---------- */
  $$('[data-stub]').forEach((a) => {
    a.title = 'Ссылка-заглушка (демо)';
    a.addEventListener('click', (e) => e.preventDefault());
  });
  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------- Калькулятор ---------- */
  // ЗАМЕНИТЬ: базовые цены (для седана), коэффициенты и описания — значения вымышленные
  const CALC_PRICES = [
    { id: 'diag',     label: 'Диагностика',              base: 1000, booking: 'Диагностика',              desc: 'Осмотр на подъёмнике и отчёт с фото.' },
    { id: 'oil',      label: 'Замена масла и ТО',        base: 1500, booking: 'Замена масла и ТО',        desc: 'Масло, фильтры и проверка по регламенту.' },
    { id: 'chassis',  label: 'Ремонт ходовой',           base: 2000, booking: 'Ремонт ходовой',           desc: 'Цена за замену одного узла подвески.' },
    { id: 'brakes',   label: 'Тормозная система',        base: 1200, booking: 'Тормозная система',        desc: 'Замена колодок на одной оси.' },
    { id: 'tires',    label: 'Шиномонтаж',               base: 1600, booking: 'Шиномонтаж',               desc: 'Переобувка 4 колёс с балансировкой.' },
    { id: 'computer', label: 'Компьютерная диагностика', base: 800,  booking: 'Компьютерная диагностика', desc: 'Ошибки всех блоков и расшифровка.' },
    { id: 'electro',  label: 'Автоэлектрика',            base: 1000, booking: 'Автоэлектрика',            desc: 'Поиск неисправности, час работы.' },
  ];
  const CLASS_K = { sedan: 1, crossover: 1.25, suv: 1.5 };

  const calcForm = $('#calc-form');
  const calcList = $('#calc-services');
  const calcOutput = $('#calc-output');
  const calcDesc = $('#calc-desc');
  let calcShown = 0;

  calcList.innerHTML = CALC_PRICES.map((s, i) => `
    <label class="calc-svc">
      <input type="radio" name="service" value="${s.id}"${i === 0 ? ' checked' : ''}>
      <span>${ICON_GO}${s.label}</span>
    </label>`).join('');

  const currentService = () => CALC_PRICES.find((s) => s.id === calcForm.elements.service.value) || CALC_PRICES[0];

  function updateCalc() {
    const service = currentService();
    const k = CLASS_K[calcForm.elements.carClass.value] || 1;
    const target = Math.round((service.base * k) / 50) * 50; // округляем до 50 ₽
    calcDesc.textContent = service.desc;
    if (!canAnimate || calcShown === 0) {
      calcShown = target;
      calcOutput.textContent = formatNum(target);
      return;
    }
    const counter = { v: calcShown };
    A.animate(counter, {
      v: target, duration: 650, ease: 'outExpo',
      onUpdate: () => { calcOutput.textContent = formatNum(counter.v); },
    });
    A.animate(calcOutput, { scale: [1.1, 1], duration: 550, ease: 'outBack' });
    calcShown = target;
  }
  calcForm.addEventListener('change', updateCalc);
  calcForm.addEventListener('submit', (e) => e.preventDefault());
  updateCalc();

  /* Кнопки «записаться» у услуг и в калькуляторе подставляют услугу в форму */
  const serviceSelect = $('#f-service');
  $('#calc-book').addEventListener('click', () => { serviceSelect.value = currentService().booking; });
  $$('[data-service]').forEach((a) => a.addEventListener('click', () => { serviceSelect.value = a.dataset.service; }));

  /* ---------- Марки: группы + слайдер ---------- */
  // ЗАМЕНИТЬ: группы и марки под специализацию клиента
  const BRAND_GROUPS = [
    { name: 'Отечественные', text: 'Плановое ТО, ходовая, электрика. Держим расходники в наличии — большинство работ в день обращения.', brands: ['LADA', 'УАЗ', 'ГАЗ'] },
    { name: 'Корейские', text: 'Одни из самых частых гостей сервиса. Знаем типовые болячки и держим запчасти на складе.', brands: ['Kia', 'Hyundai', 'Genesis', 'SsangYong'] },
    { name: 'Японские', text: 'Обслуживание по регламенту производителя, работа с вариаторами и гибридами.', brands: ['Toyota', 'Nissan', 'Mazda', 'Mitsubishi', 'Honda', 'Subaru'] },
    { name: 'Европейские', text: 'Дилерское диагностическое ПО, адаптации и кодирование блоков после замены.', brands: ['Volkswagen', 'Škoda', 'Renault', 'Audi', 'BMW', 'Mercedes-Benz'] },
    { name: 'Китайские', text: 'Новые модели приходят каждый год — следим за документацией и обновляем сканеры.', brands: ['Haval', 'Chery', 'Geely', 'Changan', 'Exeed', 'Omoda'] },
    { name: 'Коммерческие', text: 'Малый коммерческий транспорт: ТО по пробегу, ходовая, тормоза. Счёт для юрлиц.', brands: ['ГАЗель', 'Ford Transit', 'Fiat Ducato', 'Peugeot Boxer'] },
  ];

  const tabsEl = $('#brand-tabs');
  const trackEl = $('#brand-track');
  const progressEl = $('#brand-progress');
  const prevBtn = $('#brand-prev');
  const nextBtn = $('#brand-next');
  let brandIndex = 0;

  tabsEl.setAttribute('role', 'tablist');
  tabsEl.innerHTML = BRAND_GROUPS.map((g, i) => `
    <li role="presentation"><button class="brand-tab" type="button" role="tab" id="brand-tab-${i}"
      aria-controls="brand-slide-${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${ICON_GO}${g.name}</button></li>`).join('');
  trackEl.innerHTML = BRAND_GROUPS.map((g, i) => `
    <li class="brand-slide" id="brand-slide-${i}" role="tabpanel" aria-labelledby="brand-tab-${i}">
      <h3>${g.name}</h3>
      <p>${g.text}</p>
      <ul class="chips" aria-label="Марки: ${g.name}">${g.brands.map((b) => `<li class="chip">${b}</li>`).join('')}</ul>
    </li>`).join('');
  const tabs = $$('.brand-tab', tabsEl);
  const slides = $$('.brand-slide', trackEl);

  function goToBrand(i, animate = true) {
    brandIndex = Math.max(0, Math.min(BRAND_GROUPS.length - 1, i));
    const x = -slides[brandIndex].offsetLeft;
    tabs.forEach((t, k) => {
      const on = k === brandIndex;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    slides.forEach((s, k) => {
      s.setAttribute('aria-hidden', String(k !== brandIndex));
      s.style.opacity = k === brandIndex ? '1' : '0.45';
    });
    prevBtn.disabled = brandIndex === 0;
    nextBtn.disabled = brandIndex === BRAND_GROUPS.length - 1;
    const scale = (brandIndex + 1) / BRAND_GROUPS.length;
    if (canAnimate && animate) {
      A.animate(trackEl, { x, duration: 700, ease: 'outExpo' });
      A.animate(progressEl, { scaleX: scale, duration: 700, ease: 'outExpo' });
      A.animate(slides[brandIndex].querySelectorAll('.chip'), { opacity: [0, 1], y: [10, 0], delay: A.stagger(40), duration: 500, ease: 'outQuart' });
    } else {
      trackEl.style.transform = `translateX(${x}px)`;
      progressEl.style.transform = `scaleX(${scale})`;
    }
    // Держим активную вкладку в поле зрения на мобильном (горизонтальный список; страницу не прокручиваем)
    if (tabsEl.scrollWidth > tabsEl.clientWidth) {
      const li = tabs[brandIndex].parentElement;
      tabsEl.scrollTo({ left: Math.max(0, li.offsetLeft - 8), behavior: canAnimate && animate ? 'smooth' : 'auto' });
    }
  }
  tabs.forEach((t, i) => t.addEventListener('click', () => goToBrand(i)));
  tabsEl.addEventListener('keydown', (e) => {
    const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!dir) return;
    e.preventDefault();
    goToBrand(brandIndex + dir);
    tabs[brandIndex].focus();
  });
  prevBtn.addEventListener('click', () => goToBrand(brandIndex - 1));
  nextBtn.addEventListener('click', () => goToBrand(brandIndex + 1));
  slides.forEach((s, i) => s.addEventListener('click', () => { if (i !== brandIndex) goToBrand(i); }));
  // Свайп по слайдеру
  let swipeX = null;
  const viewport = $('.brands__viewport');
  viewport.addEventListener('pointerdown', (e) => { swipeX = e.clientX; });
  viewport.addEventListener('pointerup', (e) => {
    if (swipeX === null) return;
    const dx = e.clientX - swipeX;
    swipeX = null;
    if (Math.abs(dx) > 40) goToBrand(brandIndex + (dx < 0 ? 1 : -1));
  });
  window.addEventListener('resize', () => goToBrand(brandIndex, false));
  goToBrand(0, false);

  /* ---------- Форма записи: валидация и заглушка отправки ---------- */
  const form = $('#booking-form');
  const success = $('#booking-success');
  const phoneInput = $('#f-phone');
  const dateInput = $('#f-date');

  const toISODate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = new Date();
  dateInput.min = toISODate(today);
  dateInput.max = toISODate(new Date(today.getFullYear(), today.getMonth() + 3, today.getDate()));

  const phoneDigits = (v) => {
    let d = v.replace(/\D/g, '');
    if (d.length === 10) d = '7' + d;
    if (d.length === 11 && d[0] === '8') d = '7' + d.slice(1);
    return d;
  };
  phoneInput.addEventListener('input', () => {
    const clean = phoneInput.value.replace(/[^\d+()\-\s]/g, '');
    if (clean !== phoneInput.value) phoneInput.value = clean;
  });
  phoneInput.addEventListener('blur', () => {
    const d = phoneDigits(phoneInput.value);
    if (d.length === 11 && d[0] === '7') phoneInput.value = `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9, 11)}`;
  });

  const rules = {
    name: (v) => {
      const s = v.trim();
      if (!s) return 'Укажите имя';
      if (s.length < 2) return 'Имя слишком короткое';
      if (!/^[A-Za-zА-Яа-яЁё\s'-]+$/.test(s)) return 'Используйте только буквы';
      return '';
    },
    phone: (v) => {
      if (!v.trim()) return 'Укажите телефон';
      const d = phoneDigits(v);
      return d.length === 11 && d[0] === '7' ? '' : 'Введите номер в формате +7 XXX XXX-XX-XX';
    },
    car: (v) => (v.trim().length >= 2 ? '' : 'Укажите марку и модель'),
    service: (v) => (v ? '' : 'Выберите услугу'),
    date: (v) => {
      if (!v) return 'Выберите дату';
      if (v < dateInput.min) return 'Дата не может быть в прошлом';
      if (v > dateInput.max) return 'Запись открыта на 3 месяца вперёд';
      return '';
    },
    consent: (_, el) => (el.checked ? '' : 'Нужно согласие на обработку данных'),
  };

  function validateField(el) {
    const rule = rules[el.name];
    if (!rule) return true;
    const message = rule(el.value, el);
    const err = $('#' + el.getAttribute('aria-describedby'));
    el.setAttribute('aria-invalid', message ? 'true' : 'false');
    const box = el.closest('.field');
    if (box) box.classList.toggle('is-invalid', Boolean(message));
    if (err) err.textContent = message;
    return !message;
  }

  let triedSubmit = false;
  form.addEventListener('input', (e) => { if (triedSubmit) validateField(e.target); });
  form.addEventListener('change', (e) => { if (triedSubmit) validateField(e.target); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    triedSubmit = true;
    const invalid = Object.keys(rules).map((n) => form.elements[n]).filter((el) => !validateField(el));
    if (invalid.length) {
      invalid[0].focus();
      if (canAnimate) A.animate(form, { x: [0, -8, 8, -5, 5, 0], duration: 450, ease: 'inOutSine' });
      return;
    }
    submitBooking(new FormData(form));
  });

  // ЗАГЛУШКА: здесь подключается реальная отправка (fetch на обработчик, Telegram-бот, CRM)
  function submitBooking(/* data */) {
    const btn = form.querySelector('[type="submit"]');
    const label = btn.innerHTML;
    btn.disabled = true;
    btn.lastChild.textContent = ' Отправляем…';
    setTimeout(() => {
      form.hidden = true;
      success.hidden = false;
      success.focus();
      if (canAnimate) {
        A.animate(success, { opacity: [0, 1], scale: [0.96, 1], duration: 700, ease: 'outExpo' });
        A.animate('.form-success__icon', { scale: [0.4, 1], rotate: [-30, 0], duration: 900, ease: 'outElastic(1, .6)' });
      }
      btn.disabled = false;
      btn.innerHTML = label;
    }, 700);
  }

  $('#booking-again').addEventListener('click', () => {
    form.reset();
    triedSubmit = false;
    $$('[aria-invalid]', form).forEach((el) => el.removeAttribute('aria-invalid'));
    $$('.is-invalid', form).forEach((el) => el.classList.remove('is-invalid'));
    $$('.field__error', form).forEach((el) => { el.textContent = ''; });
    success.hidden = true;
    form.hidden = false;
    form.elements.name.focus();
  });

  /* ---------- FAQ: открыт только один вопрос ---------- */
  const faqItems = $$('.faq__item');
  faqItems.forEach((item) => {
    item.addEventListener('toggle', () => {
      if (!item.open) return;
      faqItems.forEach((other) => { if (other !== item) other.open = false; });
      if (canAnimate) A.animate(item.querySelector('.faq__body'), { opacity: [0, 1], y: [-8, 0], duration: 450, ease: 'outQuart' });
    });
  });

  /* ---------- Линия этапов: от первой точки до последней ---------- */
  const steps = $('.steps');
  const lineV = $('.steps__line--v');
  const lineH = $('.steps__line--h');
  function layoutStepsLine() {
    const dots = $$('.step__dot', steps);
    if (dots.length < 2) return;
    const box = steps.getBoundingClientRect();
    const c = (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 };
    };
    const first = c(dots[0]);
    const last = c(dots[dots.length - 1]);
    lineV.style.top = `${first.y}px`;
    lineV.style.height = `${Math.max(0, last.y - first.y)}px`;
    lineH.style.left = `${first.x}px`;
    lineH.style.width = `${Math.max(0, last.x - first.x)}px`;
  }
  layoutStepsLine();
  if ('ResizeObserver' in window) new ResizeObserver(layoutStepsLine).observe(steps);
  else window.addEventListener('resize', layoutStepsLine);

  /* ---------- Текущий раздел в меню ---------- */
  const navLinks = $$('.nav__list a');
  const sectionsById = navLinks.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((a) => {
        const on = a.getAttribute('href') === `#${entry.target.id}`;
        a.classList.toggle('is-active', on);
        if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sectionsById.forEach((sec) => spy.observe(sec));

  /* ================= Дальше — только анимации ================= */
  if (!canAnimate) return;
  const { animate, createTimeline, stagger, onScroll } = A;

  /* Первый экран: бейдж, слова заголовка, текст, кнопки — по очереди */
  createTimeline({ defaults: { ease: EASE, duration: 1200 } })
    .add('.hero__badge', { opacity: [0, 1], y: [16, 0] }, 150)
    .add('.hero__title .word', { opacity: [0, 1], y: ['0.6em', 0], rotate: [3, 0], delay: stagger(110) }, '-=850')
    .add('.hero__lead', { opacity: [0, 1], y: [20, 0] }, '-=800')
    .add('.hero__actions > *', { opacity: [0, 1], y: [20, 0], delay: stagger(110) }, '-=850')
    .add('.hero__strip', { opacity: [0, 1], y: [20, 0] }, '-=700');

  /* Бегущие строки: дублируем содержимое и двигаем на ширину одной копии */
  $$('.marquee').forEach((m) => {
    const track = $('.marquee__track', m);
    Array.from(track.children).forEach((li) => {
      const clone = li.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    });
    m.classList.add('is-running');
    const speed = Number(m.dataset.marquee) || 40; // пикселей в секунду
    const period = track.scrollWidth / 2;
    const anim = animate(track, { x: [0, -period], duration: (period / speed) * 1000, ease: 'linear', loop: true });
    m.addEventListener('mouseenter', () => anim.pause());
    m.addEventListener('mouseleave', () => anim.play());
    playWhileVisible(m, [anim]);
  });

  /* Появление блоков при прокрутке */
  const pendingReveal = new Set($$('[data-reveal], [data-reveal-group]'));
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => { if (entry.isIntersecting) reveal(entry.target, true); });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
  pendingReveal.forEach((el) => revealObserver.observe(el));

  function reveal(el, withAnimation) {
    if (!pendingReveal.delete(el)) return;
    revealObserver.unobserve(el);
    const group = el.hasAttribute('data-reveal-group');
    if (!withAnimation) {
      (group ? Array.from(el.children) : [el]).forEach((n) => { n.style.opacity = '1'; });
    } else if (group) {
      animate(el.children, { opacity: [0, 1], y: [64, 0], duration: 1200, ease: EASE, delay: stagger(90) });
    } else {
      animate(el, { opacity: [0, 1], y: [64, 0], duration: 1200, ease: EASE });
    }
  }
  // Блоки, которые проскочили быстрой прокруткой или переходом по якорю (уже выше экрана), показываем сразу
  let revealTick = false;
  window.addEventListener('scroll', () => {
    if (revealTick || !pendingReveal.size) return;
    revealTick = true;
    requestAnimationFrame(() => {
      revealTick = false;
      pendingReveal.forEach((el) => { if (el.getBoundingClientRect().bottom < 0) reveal(el, false); });
    });
  }, { passive: true });

  /* Счётчики */
  const countObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      obs.unobserve(entry.target);
      $$('[data-count]', entry.target).forEach((el, i) => {
        const counter = { v: 0 };
        const target = Number(el.dataset.count);
        el.textContent = '0';
        animate(counter, {
          v: target, duration: 2000, delay: 200 + i * 120, ease: 'outExpo',
          onUpdate: () => { el.textContent = formatNum(counter.v); },
        });
      });
    });
  }, { threshold: 0.4 });
  countObserver.observe($('.stats'));

  /* Линия этапов прорисовывается синхронно с прокруткой (stroke-dashoffset 1 → 0) */
  $$('.steps__draw').forEach((line) => {
    animate(line, {
      strokeDashoffset: [1, 0], ease: 'linear',
      autoplay: onScroll({ target: steps, enter: '85% top', leave: '45% bottom', sync: 0.25 }),
    });
  });
  $$('.step__dot').forEach((dot) => {
    animate(dot, { scale: [0.6, 1], duration: 600, ease: 'outBack', autoplay: onScroll({ target: dot, enter: '75% center', sync: false }) });
  });

  /* Иллюстрации в бенто-карточках: плитки слегка «плавают» */
  const floats = $$('.float').map((el) => {
    const d = Number(getComputedStyle(el).getPropertyValue('--d')) || 0;
    return animate(el, { y: [0, -7], duration: 1800 + d * 250, delay: d * 180, ease: 'inOutSine', loop: true, alternate: true });
  });
  playWhileVisible($('.bento'), floats);
  playWhileVisible($('.art-team'), [animate('.av:not(.av--blank)', {
    scale: [1, 0.86, 1], duration: 900, delay: stagger(260, { from: 'random' }), loop: true, loopDelay: 1800, ease: 'inOutQuad',
  })]);
  playWhileVisible($('.art-estimate'), [animate('.stamp', { scale: [1, 1.08, 1], rotate: [-7, -9, -7], duration: 1600, loop: true, loopDelay: 1200, ease: 'inOutSine' })]);

  /* Колесо в баннере «Почему мы» и пульс метки на карте */
  playWhileVisible($('.why__banner'), [animate('.why__wheel', { rotate: 360, duration: 26000, ease: 'linear', loop: true })]);
  playWhileVisible($('.map'), [animate('.map__pulse', { scale: [0.3, 1.6], opacity: [0.8, 0], duration: 1800, ease: 'outQuad', loop: true })]);

  /* Hover: только transform и только для мыши */
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const hover = (selector, over, out, inner) => {
      $$(selector).forEach((el) => {
        const target = inner ? el.querySelector(inner) : el;
        if (!target) return;
        el.addEventListener('mouseenter', () => animate(target, { ...over, duration: 450, ease: 'outQuart' }));
        el.addEventListener('mouseleave', () => animate(target, { ...out, duration: 650, ease: 'outQuart' }));
      });
    };
    const spring = (selector, over, out, inner) => {
      $$(selector).forEach((el) => {
        const target = inner ? el.querySelector(inner) : el;
        if (!target) return;
        el.addEventListener('mouseenter', () => animate(target, { ...over, ease: SPRING }));
        el.addEventListener('mouseleave', () => animate(target, { ...out, ease: SPRING }));
      });
    };
    spring('.bento__card, .why-card, .svc, .review', { y: -6 }, { y: 0 });
    // Кнопка-пилюля: кружок с иконкой «тянется» по диагонали
    spring('.btn', { x: 3, y: -2, scale: 1.06 }, { x: 0, y: 0, scale: 1 }, '.btn__sq');
    spring('.svc', { rotate: -12, scale: 1.08 }, { rotate: 0, scale: 1 }, '.svc__go');
    hover('.chip, .wordmark', { y: -3 }, { y: 0 });

    // «Нажатие»: кнопка слегка проседает
    $$('.btn, .svc__go, .round-btn, .icon-btn').forEach((el) => {
      el.addEventListener('pointerdown', () => animate(el, { scale: 0.97, duration: 160, ease: 'outQuad' }));
      const release = () => animate(el, { scale: 1, ease: SPRING });
      el.addEventListener('pointerup', release);
      el.addEventListener('pointerleave', release);
    });

    // «Прожектор» под курсором на карточках
    $$('.svc, .bento__card, .why-card').forEach((card) => {
      card.classList.add('spot');
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
  }
})();
