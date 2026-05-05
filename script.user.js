// ==UserScript==
// @name            Aspirez Profile Card on Steam
// @name:ru         Карточка профиля Aspirez в Steam
// @namespace       https://aspirez.ru/
// @version         3.0.1
// @author          VelFan
// @homepageURL     https://github.com/AlexVin-Dev/Aspirez-Profile-Card-on-Steam
// @supportURL      https://github.com/AlexVin-Dev/Aspirez-Profile-Card-on-Steam/issues
// @updateURL       https://raw.githubusercontent.com/AlexVin-Dev/Aspirez-Profile-Card-on-Steam/main/aspirez-steam-card.user.js
// @downloadURL     https://raw.githubusercontent.com/AlexVin-Dev/Aspirez-Profile-Card-on-Steam/main/aspirez-steam-card.user.js
// @description     Отображает информацию пользователя из Aspirez в профиле Steam
// @description:ru  Показывает данные из сайта Aspirez (ник, ранг, роль) в карточке на странице профиля Steam
// @match           https://steamcommunity.com/profiles/*
// @match           https://steamcommunity.com/id/*
// @icon            https://aspirez.ru/images/favicon.ico
// @grant           GM_xmlhttpRequest
// @grant           GM_addStyle
// @connect         aspirez.ru
// @connect         steamcommunity.com
// @license         MIT
// ==/UserScript==

(function() {
    'use strict';

    // ---- Получение SteamID64 из /id/username ----
    function getSteamIdFromVanity(vanity, callback) {
        GM_xmlhttpRequest({
            method: 'GET',
            url: `https://steamcommunity.com/id/${vanity}/?xml=1`,
            onload: (resp) => {
                const parser = new DOMParser();
                const xml = parser.parseFromString(resp.responseText, 'text/xml');
                const steamId = xml.querySelector('steamID64')?.textContent;
                if (steamId) {
                    callback(steamId);
                } else {
                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: `https://steamcommunity.com/id/${vanity}`,
                        onload: (resp2) => {
                            const match = resp2.responseText.match(/g_rgProfileData\s*=\s*{\s*"steamid"\s*:\s*"(\d+)"/);
                            callback(match ? match[1] : null);
                        },
                        onerror: () => callback(null)
                    });
                }
            },
            onerror: () => callback(null)
        });
    }

    function getSteamId(callback) {
        const path = window.location.pathname;
        const profilesMatch = path.match(/\/profiles\/(\d+)/);
        if (profilesMatch) {
            callback(profilesMatch[1]);
            return;
        }
        const idMatch = path.match(/\/id\/([^\/]+)/);
        if (idMatch) {
            getSteamIdFromVanity(idMatch[1], callback);
            return;
        }
        callback(null);
    }

    function fetchAspirezData(steamid, callback) {
        const apiUrl = `https://aspirez.ru/api/get_aspirez_user.php?steamid=${steamid}`;
        GM_xmlhttpRequest({
            method: 'GET',
            url: apiUrl,
            onload: (resp) => {
                if (resp.status !== 200) {
                    callback(null);
                    return;
                }
                try {
                    const data = JSON.parse(resp.responseText);
                    callback(data);
                } catch(e) {
                    callback(null);
                }
            },
            onerror: () => callback(null)
        });
    }

    // ---- Стили, полностью имитирующие блоки Steam ----
    GM_addStyle(`
        .aspirez_steam_block {
            background: rgba( 32, 44, 58, 1);
            border-radius: 4px;
            margin-bottom: 12px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        .aspirez_steam_block .aspirez_header {
            background: rgba( 0, 0, 0, 0.2);
            padding: 8px 12px;
            font-family: "Motiva Sans", Arial, Helvetica, sans-serif;
            font-weight: normal;
            font-size: 16px;
            color: #e5e5e5;
            letter-spacing: 1px;
            border-bottom: 1px solid rgba( 255, 255, 255, 0.1);
        }
        .aspirez_steam_block .aspirez_content {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
        }
        .aspirez_avatar {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: #2c3e4e;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            overflow: hidden;
            flex-shrink: 0;
        }
        .aspirez_avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .aspirez_info {
            flex: 1;
            font-family: "Motiva Sans", Arial, Helvetica, sans-serif;
        }
        .aspirez_info .aspirez_name {
            font-size: 15px;
            font-weight: 600;
            color: #ebebeb;
        }
        .aspirez_info .aspirez_details {
            font-size: 12px;
            color: #96a1ad;
            margin-top: 2px;
        }
        .aspirez_info .aspirez_details span {
            background: rgba(103, 133, 158, 0.25);
            padding: 2px 6px;
            border-radius: 16px;
            display: inline-block;
            margin-right: 8px;
        }
        .aspirez_link {
            flex-shrink: 0;
            background: rgba(103, 133, 158, 0.2);
            padding: 6px 14px;
            border-radius: 4px;
            transition: background 0.2s;
        }
        .aspirez_link a {
            color: #ffa500;
            text-decoration: none;
            font-size: 12px;
            font-weight: 500;
        }
        .aspirez_link:hover {
            background: rgba(103, 133, 158, 0.4);
        }
        @media (max-width: 600px) {
            .aspirez_content {
                flex-wrap: wrap;
            }
            .aspirez_link {
                width: 100%;
                text-align: center;
            }
        }
    `);

    function buildCard(userData) {
    const block = document.createElement('div');
    block.className = 'aspirez_steam_block';

    const header = document.createElement('div');
    header.className = 'aspirez_header';
    header.textContent = 'Aspirez Profile';
    block.appendChild(header);

    const content = document.createElement('div');
    content.className = 'aspirez_content';

    if (!userData || !userData.found) {
        content.innerHTML = `
            <div class="aspirez_avatar">🎮</div>
            <div class="aspirez_info">
                <div class="aspirez_name">Не привязан к Aspirez</div>
                <div class="aspirez_details">Свяжите профиль, чтобы отобразить достижения</div>
            </div>
            <div class="aspirez_link">
                <a href="https://aspirez.ru" target="_blank">Привязать →</a>
            </div>
        `;
    } else {
        let rankHtml = '';
        if (userData.currentrank) rankHtml = `<span>🏅 ${escapeHtml(userData.currentrank)}</span>`;
        else if (userData.rank) rankHtml = `<span>⭐ ${escapeHtml(userData.rank)}</span>`;

        // Блок биографии (если есть)
        const bioHtml = userData.bio ? `
            <div class="aspirez_bio">
                <span class="aspirez_bio_icon">📝</span>
                <span class="aspirez_bio_text">${escapeHtml(userData.bio)}</span>
            </div>
        ` : '';

        content.innerHTML = `
            <div class="aspirez_avatar">
                ${userData.avatar ? `<img src="${escapeHtml(userData.avatar)}" alt="">` : '👤'}
            </div>
            <div class="aspirez_info">
                <div class="aspirez_name">${escapeHtml(userData.username)}</div>
                <div class="aspirez_details">
                    <span>🎭 ${escapeHtml(userData.role || 'Игрок')}</span>
                    ${rankHtml}
                </div>
                ${bioHtml}
            </div>
            <div class="aspirez_link">
                <a href="${escapeHtml(userData.profile_url || 'https://aspirez.ru')}" target="_blank">Профиль Aspirez →</a>
            </div>
        `;
    }

    block.appendChild(content);
    return block;
}

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, (m) => {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    function injectIntoCustomizationArea(userData) {
        // Ищем контейнер, куда Steam складывает настраиваемые блоки
        let target = document.querySelector('.profile_customization_area');
        // Если нет, пробуем другие возможные контейнеры (например, в правой колонке)
        if (!target) {
            target = document.querySelector('.profile_rightcol');
        }
        if (!target) {
            // Повторим попытку через некоторое время, если элемент ещё не загрузился
            if (!window._aspirezRetry) window._aspirezRetry = 0;
            if (window._aspirezRetry < 10) {
                window._aspirezRetry++;
                setTimeout(() => injectIntoCustomizationArea(userData), 500);
            }
            return;
        }
        // Удаляем предыдущую карточку, если была
        const oldBlock = target.querySelector('.aspirez_steam_block');
        if (oldBlock) oldBlock.remove();

        const card = buildCard(userData);
        // Вставляем в самое начало контейнера
        if (target.firstChild) {
            target.insertBefore(card, target.firstChild);
        } else {
            target.appendChild(card);
        }
    }

    function init() {
        getSteamId((steamid) => {
            if (!steamid) return;
            fetchAspirezData(steamid, (data) => {
                injectIntoCustomizationArea(data || { found: false });
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
