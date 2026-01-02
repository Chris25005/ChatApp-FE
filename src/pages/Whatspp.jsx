import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";

/* 🔁 CHANGE THIS FOR PROD */
const API_BASE = "https://chatapp-be-1-jety.onrender.com";
// const API_BASE = "https://chatapp-be-1-jety.onrender.com";

function WhatsApp() {
  const me = JSON.parse(localStorage.getItem("user"));

  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);

  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const selectedUserRef = useRef(null);

  /* ===================== HELPERS ===================== */
  const formatTime = (date) =>
    date
      ? new Date(date).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

  const formatLastSeen = (date) => {
    if (!date) return "offline";
    const d = new Date(date);
    const today = new Date();

    return d.toDateString() === today.toDateString()
      ? `last seen today at ${formatTime(d)}`
      : `last seen on ${d.toLocaleDateString()} at ${formatTime(d)}`;
  };

  /* ===================== TRACK SELECTED USER ===================== */
  useEffect(() => {
    selectedUserRef.current = selectedUser?._id || null;
  }, [selectedUser]);

  /* ===================== LOGOUT ===================== */
  const logout = () => {
    localStorage.removeItem("user");
    window.location.reload();
  };

  /* ===================== SOCKET SETUP ===================== */
  useEffect(() => {
    if (!me?._id) return;

    socketRef.current = io(API_BASE, {
      transports: ["polling", "websocket"],
    });

    socketRef.current.emit("user-online", me._id);

    socketRef.current.on("online-users", setOnlineUsers);

    socketRef.current.on("receiveMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);

      if (selectedUserRef.current === msg.senderId) {
        socketRef.current.emit("messageSeen", {
          senderId: msg.senderId,
          messageIds: [msg._id],
        });
      }
    });

    socketRef.current.on("messageSeen", ({ messageIds }) => {
      setMessages((prev) =>
        prev.map((m) =>
          messageIds.includes(m._id)
            ? { ...m, status: "seen" }
            : m
        )
      );
    });

    socketRef.current.on("typing", ({ senderId }) => {
      if (senderId === selectedUserRef.current) setTyping(true);
    });

    socketRef.current.on("stopTyping", () => setTyping(false));

    return () => socketRef.current.disconnect();
  }, [me?._id]);

  /* ===================== FETCH USERS ===================== */
  useEffect(() => {
    if (!me?._id) return;

    axios.get(`${API_BASE}/api/users`).then((res) => {
      setUsers(res.data.filter((u) => u._id !== me._id));
    });
  }, [me?._id]);

  /* ===================== FETCH MESSAGES ===================== */
  useEffect(() => {
    if (!selectedUser) return;

    axios
      .get(`${API_BASE}/api/messages/${me._id}/${selectedUser._id}`)
      .then((res) => {
        setMessages(res.data);

        const unseen = res.data
          .filter(
            (m) =>
              m.senderId === selectedUser._id && m.status !== "seen"
          )
          .map((m) => m._id);

        if (unseen.length) {
          socketRef.current.emit("messageSeen", {
            senderId: selectedUser._id,
            messageIds: unseen,
          });
        }
      });

    setTyping(false);
  }, [selectedUser, me?._id]);

  /* ===================== AUTO SCROLL ===================== */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ===================== SEND MESSAGE ===================== */
  const sendMessage = async () => {
    if (!text.trim() || !selectedUser) return;

    const res = await axios.post(`${API_BASE}/api/send`, {
      senderId: me._id,
      receiverId: selectedUser._id,
      text,
    });

    setMessages((prev) => [...prev, { ...res.data, status: "sent" }]);
    socketRef.current.emit("sendMessage", res.data);

    socketRef.current.emit("stopTyping", {
      receiverId: selectedUser._id,
    });

    setText("");
  };

  /* ===================== TYPING ===================== */
  const handleTyping = (e) => {
    setText(e.target.value);

    socketRef.current.emit("typing", {
      senderId: me._id,
      receiverId: selectedUser?._id,
    });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current.emit("stopTyping", {
        receiverId: selectedUser?._id,
      });
    }, 800);
  };

  /* ===================== TICKS ===================== */
  const renderTicks = (msg) => {
    if (msg.status === "sent") return "✓";
    if (msg.status === "delivered") return "✓✓";
    if (msg.status === "seen")
      return <span className="text-green-300">✓✓</span>;
  };

  /* ===================== UI ===================== */
  return (
    <div className="h-screen flex bg-black">
      {/* LEFT */}
      <div className="w-1/3 bg-gray-900 border-r border-green-600">
        <div className="bg-green-600 text-black p-4 flex justify-between">
          <span>WhatsApp</span>
          <div className="flex gap-3 items-center">
            <span className="text-sm">{me?.name}</span>
            <button
              onClick={logout}
              className="bg-red-600 px-2 py-1 text-xs rounded"
            >
              Logout
            </button>
          </div>
        </div>

        {users.map((u) => (
          <div
            key={u._id}
            onClick={() => setSelectedUser(u)}
            className={`p-4 cursor-pointer border-b border-gray-700 ${
              selectedUser?._id === u._id
                ? "bg-gray-800 border-l-4 border-green-600"
                : "hover:bg-gray-800"
            }`}
          >
            <div className="text-green-400 font-medium">{u.name}</div>
            <div className="text-xs text-green-600">
              {onlineUsers.includes(u._id)
                ? "online"
                : formatLastSeen(u.lastSeen)}
            </div>
          </div>
        ))}
      </div>

      {/* CHAT */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            <div className="bg-gray-900 p-4 border-b border-green-600">
              <div className="text-green-400 font-semibold">
                {selectedUser.name}
              </div>
              <div className="text-xs text-green-500">
                {onlineUsers.includes(selectedUser._id)
                  ? "online"
                  : formatLastSeen(selectedUser.lastSeen)}
              </div>
              {typing && (
                <div className="text-xs text-green-300">typing...</div>
              )}
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-2">
              {messages.map((msg) => (
                <div
                  key={msg._id}
                  className={`flex ${
                    msg.senderId === me._id
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`px-3 py-2 rounded-lg max-w-[60%] ${
                      msg.senderId === me._id
                        ? "bg-green-600 text-black"
                        : "bg-gray-800 text-green-400 border border-green-600"
                    }`}
                  >
                    <div>{msg.text}</div>
                    <div className="text-[10px] flex justify-end gap-1 mt-1">
                      <span>{formatTime(msg.createdAt)}</span>
                      {msg.senderId === me._id && renderTicks(msg)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="p-3 bg-gray-900 flex border-t border-green-600">
              <input
                value={text}
                onChange={handleTyping}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                className="flex-1 px-4 py-2 bg-gray-800 border border-green-600 rounded-full text-green-400 outline-none"
                placeholder="Type a message"
              />
              <button
                onClick={sendMessage}
                className="ml-2 bg-green-600 px-4 py-2 rounded-full font-bold"
              >
                ➤
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-green-600">
            Select a chat to start messaging
          </div>
        )}
      </div>
    </div>
  );
}

export default WhatsApp;
