// Client WebSocket : rejoint une room, relaie les actions, signale les départs.
export function connect({ room, onWaiting, onStart, onAction, onOpponentLeft, onClosed }) {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}/ws`);

  ws.onopen = () => ws.send(JSON.stringify({ type: 'join', room: room || null }));
  ws.onmessage = (e) => {
    let m;
    try { m = JSON.parse(e.data); } catch { return; }
    if (m.type === 'waiting') onWaiting?.(m.room);
    else if (m.type === 'start') onStart?.(m);
    else if (m.type === 'action') onAction?.(m.action);
    else if (m.type === 'opponentLeft') onOpponentLeft?.();
  };
  ws.onclose = () => onClosed?.();

  return {
    sendAction: (action) => {
      if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'action', action }));
    },
  };
}
