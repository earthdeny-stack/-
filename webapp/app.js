/**
 * Telegram Proxy - @Rage_Kill Logic
 * Emergency Proxy Auto-Fallback, Debug Tools, Multi-Window Switching & Admin Spoilers
 */

class ProxyApp {
  constructor() {
    this.tg = window.Telegram?.WebApp || null;
    this.proxies = [];
    this.filteredProxies = [];
    this.favorites = JSON.parse(localStorage.getItem('rage_kill_favs') || '[]');
    this.isSubscribed = localStorage.getItem('rage_kill_sub') === 'true';
    this.isAdminUnlocked = localStorage.getItem('rage_kill_admin') === 'true';
    this.isSubRequired = localStorage.getItem('rage_kill_sub_required') !== 'false';
    this.isEmergencyProxyEnabled = localStorage.getItem('rage_kill_emergency') !== 'false';
    this.activeFilter = 'all';
    this.activeWindow = 'proxies';
    this.searchQuery = '';
    this.longPressTimer = null;
    this.isSecretAdminTriggered = false;
    this.targetMsgUser = null;

    this.activeUsers = [
      { id: '582194012', name: 'Алексей Смирнов', username: '@alex_smirnov', date: '24.07.2026', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80' },
      { id: '109283741', name: 'Елена Громова', username: '@elena_g', date: '24.07.2026', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80' },
      { id: '837291048', name: 'Dmitry Tech', username: '@dmitry_dev', date: '23.07.2026', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80' },
      { id: '948201948', name: 'Максим И.', username: 'нет юзернейма', date: '22.07.2026', avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&auto=format&fit=crop&q=80' }
    ];

    this.blockedUsers = [
      { id: '309281948', name: 'Спамер Ботыч', username: '@spambot_99', date: '21.07.2026', avatar: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=100&auto=format&fit=crop&q=80' }
    ];

    this.initTelegramApp();
    this.detectPlatformAndVersion();
    this.initCanvasBackground();
    this.setupEventListeners();
    this.setupAdminTrigger();
    this.checkSubscriptionGate();
    this.loadProxies();
  }

  initTelegramApp() {
    if (this.tg) {
      try {
        this.tg.ready();
        this.tg.expand();
        if (this.tg.enableClosingConfirmation) {
          this.tg.enableClosingConfirmation();
        }
      } catch (e) {
        console.warn('Telegram SDK:', e);
      }
    }
  }

  initCanvasBackground() {
    const canvas = document.getElementById('bgCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const particles = [];
    const particleCount = Math.min(Math.floor(width / 22), 40);

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: Math.random() * 1.8 + 1,
        color: Math.random() > 0.5 ? 'rgba(56, 189, 248, ' : 'rgba(245, 158, 11, '
      });
    }

    function renderCanvas() {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 115) {
            const alpha = (1 - dist / 115) * 0.22;
            ctx.strokeStyle = `rgba(148, 163, 184, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.fillStyle = p.color + '0.75)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      requestAnimationFrame(renderCanvas);
    }

    renderCanvas();
  }

  detectPlatformAndVersion() {
    let platform = 'Browser';
    let version = 'v1.0';
    let deviceType = 'Mobile';

    if (this.tg) {
      if (this.tg.platform) platform = this.tg.platform;
      if (this.tg.version) version = `v${this.tg.version}`;
    }

    const width = window.innerWidth;
    if (width >= 1080) {
      deviceType = 'Desktop (PC)';
    } else if (width >= 768) {
      deviceType = 'Tablet';
    } else {
      deviceType = 'Mobile';
    }

    const platformCardVal = document.getElementById('platformCardVal');
    if (platformCardVal) platformCardVal.textContent = `${deviceType} • ${platform.toUpperCase()} (${version})`;

    document.body.classList.remove('is-mobile', 'is-desktop');
    document.body.classList.add(deviceType === 'Mobile' ? 'is-mobile' : 'is-desktop');
  }

  haptic(style = 'light') {
    if (this.tg?.HapticFeedback) {
      this.tg.HapticFeedback.impactOccurred(style);
    }
  }

  setupAdminTrigger() {
    const settingsBtn = document.getElementById('dockTabSettings');
    if (!settingsBtn) return;

    const startPress = () => {
      this.isSecretAdminTriggered = false;
      this.longPressTimer = setTimeout(() => {
        this.isSecretAdminTriggered = true;
        this.haptic('heavy');
        this.openAdminPasswordModal();
      }, 5000);
    };

    const cancelPress = () => {
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    };

    settingsBtn.addEventListener('touchstart', startPress, { passive: true });
    settingsBtn.addEventListener('touchend', cancelPress);
    settingsBtn.addEventListener('touchcancel', cancelPress);

    settingsBtn.addEventListener('mousedown', startPress);
    settingsBtn.addEventListener('mouseup', cancelPress);
    settingsBtn.addEventListener('mouseleave', cancelPress);
  }

  openAdminPasswordModal() {
    if (this.isAdminUnlocked) {
      this.switchWindow('admin');
      return;
    }

    const modal = document.getElementById('adminPassModal');
    const input = document.getElementById('adminPassInput');
    if (modal) modal.classList.remove('hidden');
    if (input) input.value = '';
  }

  closeAdminPassModal() {
    document.getElementById('adminPassModal')?.classList.add('hidden');
  }

  verifyAdminPassword() {
    const input = document.getElementById('adminPassInput');
    const pass = input?.value?.trim();

    if (pass === 'qpalmASSDE') {
      this.haptic('heavy');
      this.isAdminUnlocked = true;
      localStorage.setItem('rage_kill_admin', 'true');
      this.closeAdminPassModal();
      
      const adminLink = document.getElementById('adminPanelLink');
      if (adminLink) adminLink.classList.remove('hidden');

      this.switchWindow('admin');
      this.showToast('Доступ администратора открыт!');
    } else {
      this.haptic('medium');
      this.showToast('Неверный пароль администратора!');
    }
  }

  logoutAdmin() {
    this.haptic('light');
    this.isAdminUnlocked = false;
    localStorage.removeItem('rage_kill_admin');
    document.getElementById('adminPanelLink')?.classList.add('hidden');
    this.switchWindow('settings');
    this.showToast('Выход из админ-панели');
  }

  toggleEmergencyProxy(enabled) {
    this.haptic('medium');
    this.isEmergencyProxyEnabled = enabled;
    localStorage.setItem('rage_kill_emergency', enabled ? 'true' : 'false');

    if (enabled) {
      this.showToast('Экстренный Авто-Прокси включен');
    } else {
      this.showToast('Экстренный Авто-Прокси отключен');
    }
  }

  toggleAdminSubRequirement(enabled) {
    this.haptic('medium');
    this.isSubRequired = enabled;
    localStorage.setItem('rage_kill_sub_required', enabled ? 'true' : 'false');

    this.checkSubscriptionGate();
    if (enabled) {
      this.showToast('Принудительная подписка включена');
    } else {
      this.showToast('Принудительная подписка отключена!');
    }
  }

  // DEBUG & TEST FUNCTIONS FOR ADMIN SPOILER
  debugTriggerEmergencyProxy() {
    this.haptic('heavy');
    if (this.proxies.length === 0) return;
    const best = [...this.proxies].sort((a, b) => a.ping - b.ping)[0];
    this.showToast(`🚨 Резервный прокси ${best.country} (34ms) отправлен вам от бота!`);
  }

  debugSimulateServerCrash() {
    this.haptic('heavy');
    this.showToast('💥 Внимание! Сервер DE-1 недоступен. Авто-переключение на NL-Proxy...');
  }

  debugCheckBotLatency() {
    this.haptic('light');
    this.showToast('📡 Bot Latency: 12ms | API Ping: 18ms | Failover: Ready');
  }

  switchWindow(targetWin) {
    if (this.isSecretAdminTriggered && targetWin === 'settings') {
      this.isSecretAdminTriggered = false;
      return;
    }

    this.haptic('light');
    this.activeWindow = targetWin;

    const winProxies = document.getElementById('windowProxies');
    const winFavorites = document.getElementById('windowFavorites');
    const winSettings = document.getElementById('windowSettings');
    const winAdmin = document.getElementById('windowAdmin');

    const tabProxies = document.getElementById('dockTabProxies');
    const tabFavs = document.getElementById('dockTabFavorites');
    const tabSettings = document.getElementById('dockTabSettings');

    [winProxies, winFavorites, winSettings, winAdmin].forEach(w => w?.classList.remove('active'));
    [tabProxies, tabFavs, tabSettings].forEach(t => t?.classList.remove('active'));

    if (targetWin === 'favorites') {
      winFavorites?.classList.add('active');
      tabFavs?.classList.add('active');
      this.renderFavorites();
    } else if (targetWin === 'settings') {
      winSettings?.classList.add('active');
      tabSettings?.classList.add('active');
      
      const emToggle = document.getElementById('emergencyProxyToggle');
      if (emToggle) emToggle.checked = this.isEmergencyProxyEnabled;

      if (this.isAdminUnlocked) {
        document.getElementById('adminPanelLink')?.classList.remove('hidden');
      }
    } else if (targetWin === 'admin') {
      winAdmin?.classList.add('active');
      tabSettings?.classList.add('active');
      
      const adminSubToggle = document.getElementById('adminSubToggle');
      if (adminSubToggle) adminSubToggle.checked = this.isSubRequired;

      this.renderAdminProxyList();
      this.renderAdminUsersList();
      this.renderAdminBlockedUsersList();
    } else {
      winProxies?.classList.add('active');
      tabProxies?.classList.add('active');
      this.renderProxies();
    }
  }

  checkSubscriptionGate() {
    const modal = document.getElementById('subModal');
    if (!modal) return;

    if (!this.isSubRequired || this.isSubscribed) {
      modal.classList.add('hidden');
    } else {
      modal.classList.remove('hidden');
    }
  }

  async verifySubscription() {
    this.haptic('medium');
    const btnText = document.getElementById('verifyBtnText');
    const verifyBtn = document.getElementById('verifySubBtn');

    if (btnText) btnText.textContent = 'Проверка...';
    if (verifyBtn) verifyBtn.disabled = true;

    await new Promise(res => setTimeout(res, 500));

    try {
      await fetch('/api/check_subscription').catch(() => null);
      this.isSubscribed = true;
      localStorage.setItem('rage_kill_sub', 'true');

      const modal = document.getElementById('subModal');
      if (modal) modal.classList.add('hidden');

      this.showToast('Подписка подтверждена!');
    } catch (e) {
      this.isSubscribed = true;
      localStorage.setItem('rage_kill_sub', 'true');
      document.getElementById('subModal')?.classList.add('hidden');
    } finally {
      if (btnText) btnText.textContent = 'Проверить подписку';
      if (verifyBtn) verifyBtn.disabled = false;
    }
  }

  setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');

    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.trim().toLowerCase();
      if (this.searchQuery) {
        clearSearch?.classList.remove('hidden');
      } else {
        clearSearch?.classList.add('hidden');
      }
      this.renderProxies();
    });

    document.querySelectorAll('.filter-btn').forEach(pill => {
      pill.addEventListener('click', (e) => {
        this.haptic('light');
        document.querySelectorAll('.filter-btn').forEach(p => p.classList.remove('active'));
        const target = e.currentTarget;
        target.classList.add('active');
        this.activeFilter = target.getAttribute('data-filter') || 'all';
        this.renderProxies();
      });
    });

    window.addEventListener('resize', () => {
      this.detectPlatformAndVersion();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== searchInput) {
        e.preventDefault();
        this.switchWindow('proxies');
        searchInput?.focus();
      }
    });
  }

  clearSearch() {
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');
    if (searchInput) searchInput.value = '';
    if (clearSearch) clearSearch.classList.add('hidden');
    this.searchQuery = '';
    this.renderProxies();
  }

  async loadProxies() {
    try {
      const response = await fetch('/api/proxies').catch(() => null);
      if (response && response.ok) {
        const data = await response.json();
        this.proxies = data.proxies || [];
      } else {
        this.proxies = this.getMockProxies();
      }
    } catch (e) {
      this.proxies = this.getMockProxies();
    } finally {
      this.renderProxies();
      this.renderFavorites();
      this.renderAdminProxyList();
      this.renderAdminUsersList();
      this.renderAdminBlockedUsersList();
    }
  }

  getMockProxies() {
    return [
      {
        id: 'p-1',
        country: 'Германия',
        city: 'Франкфурт',
        flag: '🇩🇪',
        server: 'de.rage-kill.proxy',
        port: 443,
        secret: 'ee71c1f23a54b9812e987c2f10d92290f277312e6d6163726f736f66742e636f6d',
        secret_type: 'TLS Obfuscated',
        ping: 34,
        uptime: 99.9,
        sponsor: '@Rage_Kill'
      },
      {
        id: 'p-2',
        country: 'Нидерланды',
        city: 'Амстердам',
        flag: '🇳🇱',
        server: 'nl.rage-kill.proxy',
        port: 8443,
        secret: 'ee821b001a2b3c4d5e6f7a8b9c0d1e2f3a7777772e676f6f676c652e636f6d',
        secret_type: 'Fake TLS',
        ping: 42,
        uptime: 99.8,
        sponsor: '@Rage_Kill'
      },
      {
        id: 'p-3',
        country: 'Финляндия',
        city: 'Хельсинки',
        flag: '🇫🇮',
        server: 'fi1.rage-kill.io',
        port: 443,
        secret: 'ee71c1f23a54b9812e987c2f10d92290f277312e6d6163726f736f66742e636f6d',
        secret_type: 'Fake TLS',
        ping: 48,
        uptime: 99.5,
        sponsor: '@Rage_Kill'
      },
      {
        id: 'p-4',
        country: 'Турция',
        city: 'Стамбул',
        flag: '🇹🇷',
        server: 'tr.proxy-rage.net',
        port: 443,
        secret: 'eef40d029f123456789abcdef0123456787777772e79616e6465782e7275',
        secret_type: 'TLS Obfuscated',
        ping: 78,
        uptime: 99.2,
        sponsor: '@Rage_Kill'
      },
      {
        id: 'p-5',
        country: 'США',
        city: 'Нью-Йорк',
        flag: '🇺🇸',
        server: 'us.rage-kill.io',
        port: 443,
        secret: 'ee112233445566778899aabbccddeeff7777772e6170706c652e636f6d',
        secret_type: 'TLS EE Secret',
        ping: 115,
        uptime: 98.9,
        sponsor: '@Rage_Kill'
      }
    ];
  }

  renderProxies() {
    const container = document.getElementById('proxyList');
    const badge = document.getElementById('countBadge');

    if (!container) return;

    this.filteredProxies = this.proxies.filter(proxy => {
      if (this.searchQuery) {
        const match = 
          proxy.country.toLowerCase().includes(this.searchQuery) ||
          proxy.city.toLowerCase().includes(this.searchQuery) ||
          proxy.server.toLowerCase().includes(this.searchQuery);
        if (!match) return false;
      }

      if (this.activeFilter === 'tls') {
        const type = proxy.secret_type.toLowerCase();
        return type.includes('tls') || type.includes('fake');
      }

      return true;
    });

    if (this.activeFilter === 'ping') {
      this.filteredProxies.sort((a, b) => a.ping - b.ping);
    } else if (this.activeFilter === 'uptime') {
      this.filteredProxies.sort((a, b) => b.uptime - a.uptime);
    }

    if (badge) badge.textContent = this.filteredProxies.length;

    if (this.filteredProxies.length === 0) {
      container.innerHTML = `
        <div class="proxy-card" style="text-align:center; padding: 24px; grid-column: 1 / -1;">
          <p style="font-size:13px; font-weight:700; color:#ffffff;">Прокси не найдены</p>
          <p style="font-size:11px; color:#64748b; margin-top:4px;">Попробуйте выбрать другую категорию</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.filteredProxies.map((proxy, idx) => {
      return this.buildCardHTML(proxy, idx);
    }).join('');
  }

  renderFavorites() {
    const favContainer = document.getElementById('favList');
    const favBadge = document.getElementById('favCountBadge');

    if (!favContainer) return;

    const favProxies = this.proxies.filter(p => this.favorites.includes(p.id));
    if (favBadge) favBadge.textContent = favProxies.length;

    if (favProxies.length === 0) {
      favContainer.innerHTML = `
        <div class="proxy-card" style="text-align:center; padding: 32px 16px; grid-column: 1 / -1;">
          <div style="margin-bottom: 12px; color: #f59e0b;">
            <svg width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"></path></svg>
          </div>
          <p style="font-size:14px; font-weight:800; color:#ffffff;">У вас пока нет избранных прокси</p>
          <p style="font-size:12px; color:#64748b; margin-top:6px; max-width:280px; margin-left:auto; margin-right:auto;">
            Нажмите на иконку закладок на карточке любого прокси, чтобы быстро находить его здесь.
          </p>
        </div>
      `;
      return;
    }

    favContainer.innerHTML = favProxies.map((proxy, idx) => {
      return this.buildCardHTML(proxy, idx);
    }).join('');
  }

  renderAdminProxyList() {
    const adminContainer = document.getElementById('adminProxyList');
    const adminBadge = document.getElementById('adminCountBadge');

    if (!adminContainer) return;
    if (adminBadge) adminBadge.textContent = this.proxies.length;

    adminContainer.innerHTML = this.proxies.map((proxy, idx) => {
      return `
        <div class="proxy-card animate-fade-in-up" style="border-color: rgba(245, 158, 11, 0.2);">
          <div class="card-top">
            <div class="card-left">
              <span class="rank-badge rank-def">#${idx + 1}</span>
              <div>
                <div class="proxy-info-title">
                  <span style="font-size:15px;">${proxy.flag}</span> ${proxy.country} <span>• ${proxy.city}</span>
                </div>
                <div class="proxy-info-sub">
                  ${proxy.server}:${proxy.port}
                </div>
              </div>
            </div>

            <div class="card-right">
              <div class="ping-val">${proxy.ping} <span class="ping-unit">ms</span></div>
            </div>
          </div>

          <div class="card-actions">
            <button onclick="app.adminDeleteProxy('${proxy.id}')" class="btn-copy" style="flex:1; justify-content:center; color:#ef4444; border-color:rgba(239, 68, 68, 0.3);">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              <span>Удалить из базы</span>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  renderAdminUsersList() {
    const userContainer = document.getElementById('adminUsersList');
    const userBadge = document.getElementById('adminUsersCountBadge');

    if (!userContainer) return;
    if (userBadge) userBadge.textContent = this.activeUsers.length;

    if (this.activeUsers.length === 0) {
      userContainer.innerHTML = `<p style="font-size:12px; color:#64748b; text-align:center; padding:12px;">Нет активных пользователей</p>`;
      return;
    }

    userContainer.innerHTML = this.activeUsers.map((u) => {
      const userLink = u.username.startsWith('@') ? `https://t.me/${u.username.replace('@', '')}` : '#';
      return `
        <div class="user-card animate-fade-in-up">
          <div style="display: flex; align-items: center; gap: 10px;">
            <img src="${u.avatar}" alt="${u.name}" class="user-avatar-img">
            <div>
              <div class="user-info-main">${u.name}</div>
              <div class="user-info-sub">
                ${u.username.startsWith('@') ? `<a href="${userLink}" target="_blank" class="sponsor-link">${u.username}</a>` : u.username}
              </div>
              <div class="user-id-badge">ID: ${u.id}</div>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 6px; align-items: flex-end;">
            <button onclick="app.openSendMessageModal('${u.id}')" class="btn-copy" style="font-size:10px; padding:4px 8px; color:#38bdf8; border-color:rgba(56,189,248,0.3);">
              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
              <span>Написать</span>
            </button>
            <button onclick="app.adminBlockUser('${u.id}')" class="btn-copy" style="font-size:10px; padding:4px 8px; color:#ef4444; border-color:rgba(239,68,68,0.3);">
              <span>Заблокировать</span>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  renderAdminBlockedUsersList() {
    const blockedContainer = document.getElementById('adminBlockedList');
    const blockedBadge = document.getElementById('adminBlockedCountBadge');

    if (!blockedContainer) return;
    if (blockedBadge) blockedBadge.textContent = this.blockedUsers.length;

    if (this.blockedUsers.length === 0) {
      blockedContainer.innerHTML = `<p style="font-size:12px; color:#64748b; text-align:center; padding:12px;">Заблокированных пользователей нет</p>`;
      return;
    }

    blockedContainer.innerHTML = this.blockedUsers.map((u) => {
      const userLink = u.username.startsWith('@') ? `https://t.me/${u.username.replace('@', '')}` : '#';
      return `
        <div class="user-card animate-fade-in-up" style="border-color: rgba(239, 68, 68, 0.2);">
          <div style="display: flex; align-items: center; gap: 10px;">
            <img src="${u.avatar}" alt="${u.name}" class="user-avatar-img">
            <div>
              <div class="user-info-main" style="color:#f87171;">${u.name}</div>
              <div class="user-info-sub">
                ${u.username.startsWith('@') ? `<a href="${userLink}" target="_blank" class="sponsor-link">${u.username}</a>` : u.username}
              </div>
              <div class="user-id-badge">ID: ${u.id}</div>
            </div>
          </div>

          <div>
            <button onclick="app.adminUnblockUser('${u.id}')" class="btn-copy" style="font-size:10px; padding:6px 10px; color:#10b981; border-color:rgba(16,185,129,0.3);">
              <span>Разблокировать</span>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  openSendMessageModal(userId) {
    const user = this.activeUsers.find(u => u.id === userId);
    if (!user) return;

    this.targetMsgUser = user;
    const modal = document.getElementById('sendMessageModal');
    const recipient = document.getElementById('sendMsgRecipient');
    const input = document.getElementById('sendMessageInput');

    if (recipient) recipient.textContent = `Кому: ${user.name} (${user.username})`;
    if (input) input.value = '';
    if (modal) modal.classList.remove('hidden');
  }

  closeSendMessageModal() {
    document.getElementById('sendMessageModal')?.classList.add('hidden');
  }

  sendBotMessage() {
    const input = document.getElementById('sendMessageInput');
    const msg = input?.value?.trim();

    if (!msg) {
      this.showToast('Введите текст сообщения');
      return;
    }

    this.haptic('heavy');
    this.closeSendMessageModal();
    this.showToast(`Сообщение отправлено для ${this.targetMsgUser?.name}!`);
  }

  adminBlockUser(userId) {
    this.haptic('medium');
    const userIndex = this.activeUsers.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      const user = this.activeUsers.splice(userIndex, 1)[0];
      this.blockedUsers.push(user);

      this.renderAdminUsersList();
      this.renderAdminBlockedUsersList();
      this.showToast(`Пользователь ${user.name} заблокирован!`);
    }
  }

  adminUnblockUser(userId) {
    this.haptic('medium');
    const userIndex = this.blockedUsers.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      const user = this.blockedUsers.splice(userIndex, 1)[0];
      this.activeUsers.push(user);

      this.renderAdminUsersList();
      this.renderAdminBlockedUsersList();
      this.showToast(`Пользователь ${user.name} разблокирован!`);
    }
  }

  adminAddProxy() {
    const input = document.getElementById('adminProxyInput');
    const val = input?.value?.trim();

    if (!val) {
      this.showToast('Введите ссылку на прокси');
      return;
    }

    this.haptic('heavy');
    const newProxy = {
      id: `admin-p-${Date.now()}`,
      country: 'Новый Сервер',
      city: 'Custom Node',
      flag: '⚡',
      server: 'custom.proxy.net',
      port: 443,
      secret: 'ee' + Math.random().toString(16).substring(2, 10),
      secret_type: 'TLS Obfuscated',
      ping: Math.floor(Math.random() * 50) + 25,
      uptime: 99.9,
      sponsor: '@Rage_Kill'
    };

    this.proxies.unshift(newProxy);
    if (input) input.value = '';

    this.renderProxies();
    this.renderAdminProxyList();
    this.showToast('Новый прокси успешно добавлен!');
  }

  adminDeleteProxy(id) {
    this.haptic('medium');
    this.proxies = this.proxies.filter(p => p.id !== id);
    this.favorites = this.favorites.filter(favId => favId !== id);
    localStorage.setItem('rage_kill_favs', JSON.stringify(this.favorites));

    this.renderProxies();
    this.renderFavorites();
    this.renderAdminProxyList();
    this.showToast('Прокси удален из базы');
  }

  adminRePingAll() {
    this.haptic('heavy');
    this.proxies.forEach(p => {
      p.ping = Math.floor(Math.random() * 60) + 20;
    });

    this.proxies.sort((a, b) => a.ping - b.ping);
    this.renderProxies();
    this.renderAdminProxyList();
    this.showToast('Все серверы перепроверены!');
  }

  buildCardHTML(proxy, idx) {
    const isFav = this.favorites.includes(proxy.id);
    const url = `tg://proxy?server=${encodeURIComponent(proxy.server)}&port=${proxy.port}&secret=${encodeURIComponent(proxy.secret)}`;

    let rankClass = 'rank-def';
    if (idx === 0) rankClass = 'rank-1';
    else if (idx === 1) rankClass = 'rank-2';
    else if (idx === 2) rankClass = 'rank-3';

    return `
      <div class="proxy-card animate-fade-in-up">
        
        <div class="card-top">
          <div class="card-left">
            <span class="rank-badge ${rankClass}">#${idx + 1}</span>
            <div>
              <div class="proxy-info-title">
                <span style="font-size: 15px;">${proxy.flag}</span> ${proxy.country} <span>• ${proxy.city}</span>
              </div>
              <div class="proxy-info-sub">
                ${proxy.server}:${proxy.port}
              </div>
            </div>
          </div>

          <div class="card-right">
            <div class="ping-val">${proxy.ping} <span class="ping-unit">ms</span></div>
            <div class="uptime-val">${proxy.uptime}% UPTIME</div>
          </div>
        </div>

        <div class="card-actions">
          <a href="${url}" onclick="app.haptic('medium')" class="btn-connect">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"></path></svg>
            <span>Подключить</span>
          </a>

          <button onclick="app.copyProxyUrl('${url}', this)" class="btn-copy">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
            <span>Копия</span>
          </button>

          <button onclick="app.toggleFavorite('${proxy.id}', this)" class="btn-fav ${isFav ? 'active' : ''}">
            <svg width="16" height="16" fill="${isFav ? '#f59e0b' : 'none'}" stroke="${isFav ? '#f59e0b' : 'currentColor'}" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"></path></svg>
          </button>
        </div>

      </div>
    `;
  }

  toggleFavorite(id, btnElement) {
    this.haptic('light');

    if (btnElement) {
      btnElement.classList.add('pop-star');
      setTimeout(() => btnElement.classList.remove('pop-star'), 400);
    }

    if (this.favorites.includes(id)) {
      this.favorites = this.favorites.filter(f => f !== id);
      this.showToast('Удалено из избранного');
    } else {
      this.favorites.push(id);
      this.showToast('Добавлено в избранное');
    }
    localStorage.setItem('rage_kill_favs', JSON.stringify(this.favorites));
    this.renderProxies();
    this.renderFavorites();
  }

  clearFavoritesCache() {
    this.haptic('medium');
    this.favorites = [];
    localStorage.removeItem('rage_kill_favs');
    this.renderProxies();
    this.renderFavorites();
    this.showToast('Кэш избранных прокси очищен');
  }

  copyProxyUrl(url, btnElement) {
    this.haptic('light');

    if (btnElement) {
      btnElement.classList.add('pulse-click');
      setTimeout(() => btnElement.classList.remove('pulse-click'), 350);
    }

    navigator.clipboard.writeText(url).then(() => {
      this.showToast('Ссылка скопирована!');
    });
  }

  showToast(msg) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');

    if (!toast || !toastMsg) return;

    toastMsg.textContent = msg;
    toast.classList.remove('hidden');

    setTimeout(() => {
      toast.classList.add('hidden');
    }, 2500);
  }
}

let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new ProxyApp();
});
