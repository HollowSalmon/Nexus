export function createWebSocketClient(url, handlers) {
  let socket = null;
  let shouldReconnect = true;
  let reconnectDelay = 1000;
  let reconnectTimer = null;

  function connect() {
    if (socket && socket.readyState === WebSocket.OPEN) {
      return;
    }

    socket = new WebSocket(url);

    socket.addEventListener("open", () => {
      reconnectDelay = 1000;
      handlers?.onOpen?.();
    });

    socket.addEventListener("message", (event) => {
      handlers?.onMessage?.(event.data);
    });

    socket.addEventListener("error", (event) => {
      handlers?.onError?.(event);
    });

    socket.addEventListener("close", () => {
      handlers?.onClose?.();
      if (shouldReconnect) {
        reconnectTimer = setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 1.5, 10000);
          connect();
        }, reconnectDelay);
      }
    });
  }

  function disconnect() {
    shouldReconnect = false;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }
    socket?.close();
    socket = null;
  }

  function send(message) {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }

  return {
    connect,
    disconnect,
    send,
  };
}
