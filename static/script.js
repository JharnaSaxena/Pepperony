// static/script.js
// written in one sitting with the window open and something sad playing
// handles the stars, the jar, the bear, and a secret or two

document.addEventListener('DOMContentLoaded', function () {
    console.log('%c✨ jar of hearts is alive', 'color: #ff69b4; font-style: italic; font-size: 14px;');
    console.log('%c💌 if you found this in the console, hi. you\'re curious. i like that.', 'color: #b8bcd8; font-size: 12px;');

    // always make the sky
    createStars();
    addShootingStar();

    // page-specific setup
    if (document.querySelector('.jar-container')) setupJarPage();
    if (document.getElementById('sendBearBtn')) setupBearButton();
    if (document.getElementById('bearStatus')) setupBearChecker();
    if (document.querySelector('[name="style"]')) setupStylePreview();
    if (document.getElementById('copyLinkBtn')) setupCopyButton();
});


// -------------------------------------------------------
// STARS
// -------------------------------------------------------

function createStars() {
    const sky = document.createElement('div');
    sky.className = 'stars';
    sky.setAttribute('aria-hidden', 'true');

    const starTypes = ['', 'warm', 'cold', 'rose'];
    const count = window.innerWidth < 480 ? 90 : 160;

    for (let i = 0; i < count; i++) {
        const s = document.createElement('div');
        const type = starTypes[Math.floor(Math.random() * starTypes.length)];
        s.className = 'star' + (type ? ' ' + type : '');

        const size = Math.random() * 2.5 + 0.5;
        const duration = (Math.random() * 4 + 2).toFixed(1);
        const opacity = (Math.random() * 0.65 + 0.2).toFixed(2);

        s.style.left     = (Math.random() * 100) + '%';
        s.style.top      = (Math.random() * 100) + '%';
        s.style.width    = size + 'px';
        s.style.height   = size + 'px';
        s.style.animationDelay = (Math.random() * 5).toFixed(1) + 's';
        s.style.setProperty('--duration', duration + 's');
        s.style.setProperty('--opacity', opacity);

        sky.appendChild(s);
    }

    document.body.insertBefore(sky, document.body.firstChild);
}

function addShootingStar() {
    const s = document.createElement('div');
    s.className = 'shooting-star';
    document.body.appendChild(s);
}


// -------------------------------------------------------
// JAR PAGE - click, shake, letter appear
// -------------------------------------------------------

function setupJarPage() {
    const container    = document.querySelector('.jar-container');
    const jarImage     = document.querySelector('.jar-image');
    const letterPopup  = document.getElementById('letterPopup');
    let letterShown    = false;

    if (!container || !jarImage) return;

    function openJar() {
        jarImage.classList.remove('shake-anim');
        void jarImage.offsetWidth;
        jarImage.classList.add('shake-anim');

        setTimeout(() => {
            if (!letterShown) {
                letterPopup.style.display = 'block';
                letterShown = true;
                burstHearts(container, 12);
                console.log('%c💌 a heart just opened.', 'color: #ff69b4;');
            }
        }, 450);
    }

    container.addEventListener('click', openJar);

    let lastX, lastY, lastZ;
    const SHAKE_THRESHOLD = 18;

    if (window.DeviceMotionEvent) {
        if (typeof DeviceMotionEvent.requestPermission === 'function') {
            const permBtn = document.createElement('button');
            permBtn.className = 'btn btn-outline btn-small';
            permBtn.style.marginTop = '0.8rem';
            permBtn.textContent = '📱 enable shake to open';
            permBtn.onclick = function () {
                DeviceMotionEvent.requestPermission().then(state => {
                    if (state === 'granted') {
                        window.addEventListener('devicemotion', handleMotion);
                        permBtn.remove();
                    }
                });
            };
            container.parentNode.insertBefore(permBtn, container.nextSibling);
        } else {
            window.addEventListener('devicemotion', handleMotion);
        }
    }

    function handleMotion(e) {
        const a = e.accelerationIncludingGravity;
        if (!a) return;
        const { x, y, z } = a;
        if (lastX !== undefined) {
            const dX = Math.abs(x - lastX);
            const dY = Math.abs(y - lastY);
            const dZ = Math.abs(z - lastZ);
            if (dX > SHAKE_THRESHOLD || dY > SHAKE_THRESHOLD || dZ > SHAKE_THRESHOLD) {
                openJar();
            }
        }
        lastX = x; lastY = y; lastZ = z;
    }
}


// -------------------------------------------------------
// HEART BURST
// -------------------------------------------------------

const HEART_EMOJIS = ['❤️','🌸','💕','✨','🌙','💫','🌹','💗'];

function burstHearts(anchor, count = 10) {
    const rect = anchor.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 3;

    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const h = document.createElement('div');
            h.innerHTML = HEART_EMOJIS[Math.floor(Math.random() * HEART_EMOJIS.length)];
            h.style.cssText = `
                position: fixed;
                left: ${cx}px;
                top: ${cy}px;
                font-size: ${Math.random() * 18 + 10}px;
                pointer-events: none;
                z-index: 9999;
                transform: translate(-50%, -50%);
                animation: burstFly ${(Math.random() * 0.6 + 0.5).toFixed(2)}s ease-out forwards;
                --tx: ${(Math.random() * 160 - 80).toFixed(0)}px;
                --ty: ${(Math.random() * -120 - 30).toFixed(0)}px;
            `;
            document.body.appendChild(h);
            setTimeout(() => h.remove(), 1200);
        }, i * 40);
    }

    if (!document.getElementById('burstStyle')) {
        const st = document.createElement('style');
        st.id = 'burstStyle';
        st.textContent = `
            @keyframes burstFly {
                0%   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                100% { opacity: 0; transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0.3); }
            }
        `;
        document.head.appendChild(st);
    }
}


// -------------------------------------------------------
// SEND BEAR BACK
// -------------------------------------------------------

function setupBearButton() {
    const btn      = document.getElementById('sendBearBtn');
    const msgDiv   = document.getElementById('bearMessage');
    const code     = btn.dataset.code;

    btn.addEventListener('click', function () {
        btn.disabled = true;
        btn.textContent = '🐻 sending...';

        fetch('/send-bear/' + code, { method: 'POST' })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                msgDiv.innerHTML = `<div class="success-message">${data.message}</div>`;
                btn.textContent = '🐻 bear sent!';
                spawnBearNearJar();
                console.log('%c🧸 a bear was sent. the world is softer now.', 'color: #c8825a;');
            } else {
                msgDiv.innerHTML = `<div class="error-message">${data.message}</div>`;
                btn.disabled = false;
                btn.textContent = '🐻 send a teddy bear back';
            }
        })
        .catch(() => {
            msgDiv.innerHTML = `<div class="error-message">something went sideways. try again?</div>`;
            btn.disabled = false;
            btn.textContent = '🐻 try again';
        });
    });
}

function spawnBearNearJar() {
    const jarContainer = document.querySelector('.jar-container');
    if (!jarContainer) return;

    const bear = document.createElement('div');
    bear.textContent = '🐻';
    bear.style.cssText = `
        position: absolute;
        bottom: -10px;
        right: -20px;
        font-size: 2.2rem;
        animation: bearAppear 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards;
        z-index: 5;
    `;
    jarContainer.style.position = 'relative';
    jarContainer.appendChild(bear);

    if (!document.getElementById('bearAppearStyle')) {
        const st = document.createElement('style');
        st.id = 'bearAppearStyle';
        st.textContent = `
            @keyframes bearAppear {
                from { opacity: 0; transform: scale(0) rotate(-20deg); }
                to   { opacity: 1; transform: scale(1) rotate(0deg); }
            }
        `;
        document.head.appendChild(st);
    }
}


// -------------------------------------------------------
// BEAR STATUS CHECKER (sender's page)
// -------------------------------------------------------

function setupBearChecker() {
    const statusEl = document.getElementById('bearStatus');
    const code     = statusEl.dataset.code;

    let checkCount = 0;

    function checkStatus() {
        fetch('/check-bear/' + code)
        .then(r => r.json())
        .then(data => {
            if (data.bear_sent) {
                statusEl.innerHTML = `
                    <div class="success-message">
                        🧸 a teddy bear arrived!<br>
                        <small style="opacity:0.7;">they sent it on ${data.sent_at}</small>
                    </div>
                `;
                rain(30);
                console.log('%c🧸 someone loves you back.', 'color: #c8825a; font-size: 14px;');
            } else {
                checkCount++;
                const delay = checkCount < 6 ? 10000 : checkCount < 12 ? 20000 : 60000;
                setTimeout(checkStatus, delay);
            }
        })
        .catch(() => {
            setTimeout(checkStatus, 30000);
        });
    }

    checkStatus();
}


// -------------------------------------------------------
// STYLE SELECT - live color preview feedback
// -------------------------------------------------------

function setupStylePreview() {
    const select = document.querySelector('[name="style"]');
    if (!select) return;

    const badge = document.getElementById('styleBadge');
    const textarea = document.querySelector('textarea[name="message"]');

    const styleInfo = {
        flirty:      { hint: 'a little playful, a little dangerous 😉',   ph: 'say something cheeky...' },
        romantic:    { hint: 'poetry they\'ll screenshot and keep 🌹',     ph: 'from the bottom of your heart...' },
        warm:        { hint: 'a hug they can re-read ☀️',                 ph: 'something gentle and true...' },
        apology:     { hint: 'words to mend what\'s broken 💙',           ph: 'say what you\'ve been meaning to...' },
        missing_you: { hint: 'for when the distance feels heavy 🌙',      ph: 'what you miss the most...' },
        grateful:    { hint: 'gratitude looks good on you 🙏',            ph: 'what you\'re thankful for...' },
    };

    const hintEl = document.getElementById('styleHint');

    function update() {
        const val = select.value;
        if (!val) return;

        if (badge) {
            badge.className = 'style-badge badge-' + val;
            badge.textContent = val.replace('_', ' ');
        }

        if (hintEl && styleInfo[val]) {
            hintEl.textContent = styleInfo[val].hint;
        }

        if (textarea && styleInfo[val]) {
            textarea.placeholder = styleInfo[val].ph;
        }
    }

    select.addEventListener('change', update);
    update();
}


// -------------------------------------------------------
// COPY LINK BUTTON
// -------------------------------------------------------

function setupCopyButton() {
    const btn   = document.getElementById('copyLinkBtn');
    const input = document.getElementById('shareLinkInput');
    if (!btn || !input) return;

    btn.addEventListener('click', function () {
        navigator.clipboard.writeText(input.value).then(() => {
            const orig = btn.textContent;
            btn.textContent = 'copied ✓';
            btn.style.color = '#6ee7b7';
            setTimeout(() => {
                btn.textContent = orig;
                btn.style.color = '';
            }, 2000);
        }).catch(() => {
            input.select();
            document.execCommand('copy');
        });
    });
}


// -------------------------------------------------------
// HEART RAIN
// -------------------------------------------------------

function rain(count = 40) {
    const all = ['❤️','🧡','💛','💚','💙','💜','🌸','✨','🌙','💫','🐻'];

    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const h = document.createElement('div');
            h.innerHTML = all[Math.floor(Math.random() * all.length)];
            h.style.cssText = `
                position: fixed;
                left: ${Math.random() * 100}%;
                top: -60px;
                font-size: ${Math.random() * 28 + 14}px;
                pointer-events: none;
                z-index: 9999;
                animation: rainFall ${(Math.random() * 2.5 + 2).toFixed(1)}s linear forwards;
            `;
            document.body.appendChild(h);
            setTimeout(() => h.remove(), 5000);
        }, i * 60);
    }

    if (!document.getElementById('rainStyle')) {
        const st = document.createElement('style');
        st.id = 'rainStyle';
        st.textContent = `
            @keyframes rainFall {
                to { transform: translateY(110vh) rotate(360deg); opacity: 0; }
            }
        `;
        document.head.appendChild(st);
    }
}


// -------------------------------------------------------
// EASTER EGG - konami code
// -------------------------------------------------------

const KONAMI = [38,38,40,40,37,39,37,39,66,65];
let konamiIdx = 0;

document.addEventListener('keydown', function (e) {
    if (e.keyCode === KONAMI[konamiIdx]) {
        konamiIdx++;
        if (konamiIdx === KONAMI.length) {
            rain(60);
            konamiIdx = 0;
            console.log('%c🦾 i am iron heart. (and i\'m wearing pink today)', 'color: #ff69b4; font-weight: bold; font-size: 16px;');
            console.log('%c"i love you 3000." — tony, probably', 'color: #ffd7e8; font-style: italic;');
        }
    } else {
        konamiIdx = 0;
    }
});

console.log('%c/secret', 'color: #6b6b8a; font-style: italic; font-size: 11px;');