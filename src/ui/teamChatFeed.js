/**
 * Team Chat Feed: safe DOM rendering (textContent only) + real-time SSE (/api/stream)
 * + Frog Card gifting + Life helping while Hội Nhà dialog is open.
 */

import { ALL_FROG_CARDS } from '../data/liveOpsDefs.js';
import { haptics } from '../utils/haptics.js';
import { sound } from '../utils/sound.js';
import { apiRequest } from './onlineApi.js';

const CHAT_POLL_MS = 15000;
let chatPollTimer = null;
let houseEventSource = null;

function feedSignature(messages) {
  return messages.map((m) => `${m.id}:${m.helpedBy.length}`).join('|');
}

/**
 * Renders messages into the feed container using DOM text nodes only.
 * @param {object} app ScapesApp
 * @param {object} hooks { onVisit(playerId), onRefresh(), onGiftsChanged(count) }
 */
export function renderChatFeed(app, chatList, messages, hooks) {
  const wasAtBottom = chatList.scrollHeight - chatList.scrollTop - chatList.clientHeight < 24;
  const prevScroll = chatList.scrollTop;
  chatList.replaceChildren();
  chatList.dataset.sig = feedSignature(messages);

  for (const m of messages) {
    const row = document.createElement('div');
    const isReq = m.kind === 'life_request' || m.kind === 'card_request';
    row.className = `online-chat-msg ${isReq ? 'life-req' : ''}`;

    const head = document.createElement('div');
    head.style.cssText = 'display:flex; justify-content:space-between; align-items:center; gap:6px;';
    const author = document.createElement('strong');
    author.textContent = `${m.playerName} (${m.playerId})`;
    head.appendChild(author);

    if (m.playerId !== app.save.playerId) {
      const vBtn = document.createElement('button');
      vBtn.type = 'button';
      vBtn.className = 'btn-playrix btn-purple';
      vBtn.style.cssText = 'padding:3px 9px; font-size:0.74rem;';
      vBtn.textContent = app.gameId === 'homescapes' ? '⚡ Thăm Lâu Đài' : '⚡ Thăm Vườn';
      vBtn.onclick = () => hooks.onVisit(m.playerId);
      head.appendChild(vBtn);
    }
    row.appendChild(head);

    const txt = document.createElement('div');
    txt.style.cssText = 'font-size:0.86rem; color:#2d1e12; margin-top:3px;';
    txt.textContent = m.text;
    row.appendChild(txt);

    if (m.kind === 'life_request') {
      const helpBar = document.createElement('div');
      helpBar.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-top:6px;';
      const prog = document.createElement('span');
      prog.style.cssText = 'font-size:0.78rem; font-weight:800; color:#9e2a2b;';
      prog.textContent = `❤️ Đã nhận trợ giúp: ${m.helpedBy.length}/5`;
      helpBar.appendChild(prog);

      const canHelp =
        m.playerId !== app.save.playerId && !m.helpedBy.includes(app.save.playerId) && m.helpedBy.length < 5;
      if (canHelp) {
        const hBtn = document.createElement('button');
        hBtn.type = 'button';
        hBtn.className = 'btn-playrix btn-gold';
        hBtn.style.cssText = 'padding:4px 10px; font-size:0.78rem;';
        hBtn.textContent = '💝 Tặng Tim (+50 💰)';
        hBtn.onclick = async () => {
          hBtn.disabled = true;
          try {
            const r = await apiRequest('/api/help-life', 'POST', { helperId: app.save.playerId, messageId: m.id });
            app.save.coins += r.rewardCoins || 50;
            app.persistAndSyncHud();
            haptics.tap();
            sound.sfxCoin();
            app.toast(`💝 Đã gửi 1 Tim cho ${m.playerName} và nhận +50 💰 Galleon!`);
            hooks.onRefresh();
          } catch (err) {
            hBtn.disabled = false;
            app.toast(`⚠️ ${err.message}`);
          }
        };
        helpBar.appendChild(hBtn);
      }
      row.appendChild(helpBar);
    } else if (m.kind === 'card_request') {
      const cardMeta = ALL_FROG_CARDS.find((c) => c.id === m.cardId);
      const worldTag =
        m.targetGame === 'homescapes' ? ' (🏰 Lâu Đài)' : m.targetGame === 'gardenscapes' ? ' (🌿 Khuôn Viên)' : '';
      const cardBar = document.createElement('div');
      cardBar.style.cssText = 'display:flex; justify-content:space-between; align-items:center; gap:6px; margin-top:6px; flex-wrap:wrap;';
      const prog = document.createElement('span');
      prog.style.cssText = 'font-size:0.78rem; font-weight:800; color:#1b5e3a;';
      prog.textContent =
        m.helpedBy.length >= 1
          ? `🐸 Đã được đồng đội tặng thẻ ${cardMeta?.name || ''}${worldTag}!`
          : `🐸 Xin thẻ${worldTag}: ${cardMeta ? `${cardMeta.icon} ${cardMeta.name}` : m.cardId}`;
      cardBar.appendChild(prog);

      if (m.playerId !== app.save.playerId && m.helpedBy.length === 0) {
        const owned = app.save.cards?.[m.cardId] || 0;
        if (owned >= 2) {
          const gBtn = document.createElement('button');
          gBtn.type = 'button';
          gBtn.className = 'btn-playrix btn-gold';
          gBtn.style.cssText = 'padding:4px 10px; font-size:0.78rem;';
          gBtn.textContent = `🎁 Tặng Thẻ Dư (+80 💰)`;
          gBtn.onclick = async () => {
            gBtn.disabled = true;
            try {
              const r = await apiRequest('/api/gift-card', 'POST', { helperId: app.save.playerId, messageId: m.id });
              app.save.cards[m.cardId] = Math.max(1, (app.save.cards[m.cardId] || 2) - 1);
              app.save.coins += r.rewardCoins || 80;
              app.persistAndSyncHud();
              haptics.tap();
              sound.sfxCoin();
              app.toast(`🐸 Đã tặng 1 bản sao "${cardMeta?.name || m.cardId}" cho ${m.playerName} (+80 💰)!`);
              hooks.onRefresh();
            } catch (err) {
              gBtn.disabled = false;
              app.toast(`⚠️ ${err.message}`);
            }
          };
          cardBar.appendChild(gBtn);
        } else {
          const note = document.createElement('span');
          note.style.cssText = 'font-size:0.74rem; color:#6c757d; font-weight:700;';
          note.textContent = `Cần ≥2 thẻ (có x${owned})`;
          cardBar.appendChild(note);
        }
      }
      row.appendChild(cardBar);
    }
    chatList.appendChild(row);
  }
  chatList.scrollTop = wasAtBottom || prevScroll === 0 ? chatList.scrollHeight : prevScroll;
}

export function stopTeamChatPolling() {
  if (chatPollTimer) clearInterval(chatPollTimer);
  chatPollTimer = null;
  if (houseEventSource) {
    try {
      houseEventSource.close();
    } catch {
      // Ignore close error
    }
    houseEventSource = null;
  }
}

/**
 * Connects SSE /api/stream for instant push + fallback 15s poll while dialog stays open.
 */
export function startTeamChatPolling(app, dialog, chatList, hooks) {
  stopTeamChatPolling();

  const refreshNow = async () => {
    if (!dialog.open || !chatList.isConnected) return stopTeamChatPolling();
    if (document.visibilityState === 'hidden') return;
    try {
      const state = await apiRequest(
        `/api/house/${app.save.house}?playerId=${encodeURIComponent(app.save.playerId)}`
      );
      if (!chatList.isConnected) return;
      if (feedSignature(state.messages) !== chatList.dataset.sig) {
        renderChatFeed(app, chatList, state.messages, hooks);
      }
      hooks.onGiftsChanged?.(state.unclaimedGifts || 0);
    } catch {
      // Transient offline
    }
  };

  if (typeof EventSource !== 'undefined') {
    try {
      houseEventSource = new EventSource(`/api/stream?house=${encodeURIComponent(app.save.house)}`);
      houseEventSource.addEventListener('house_update', () => {
        refreshNow();
      });
    } catch {
      houseEventSource = null;
    }
  }

  chatPollTimer = setInterval(refreshNow, CHAT_POLL_MS);
}
