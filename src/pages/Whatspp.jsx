import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";

const API_URL = "https://chatapp-be-lwx3.onrender.com";

function WhatsApp() {
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

  const me = JSON.parse(localStorage.getItem("user"));

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatLastSeen = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday
      ? `last seen today at ${formatTime(d)}`
      : `last seen on ${d.toLocaleDateString()} at ${formatTime(d)}`;
  };

  useEffect(() => {
    selectedUserRef.current = selectedUser?._id || null;
  }, [selectedUser]);

  const logout = () => {
    localStorage.removeItem("user");
    window.location.reload();
  };

  /* ---------- SOCKET ---------- */
  useEffect(() => {
    if (!me?._id) return;

    socketRef.current = io(API_URL, {
      transports: ["polling", "websocket"], // REQUIRED for Render
      forceNew: true,
    });

    socketRef.current.emit("user-online", me._id);
    socketRef.current.on("online-users", setOnlineUsers);

    socketRef.current.on("receiveMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);
      if (selectedUserRef.current === msg.senderId) {
        socketRef.current.emit("messageDelivered", {
          messageId: msg._id,
          senderId: msg.senderId,
        });
      }
    });

    socketRef.current.on("messageDelivered", ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, status: "delivered" } : m
        )
      );
    });

    socketRef.current.on("messageSeen", ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, status: "seen" } : m
        )
      );
    });

    socketRef.current.on("typing", ({ senderId }) => {
      if (senderId === selectedUserRef.current) setTyping(true);
    });

    socketRef.current.on("stopTyping", () => setTyping(false));

    return () => socketRef.current.disconnect();
  }, [me?._id]);

  /* ---------- USERS ---------- */
  useEffect(() => {
    if (!me?._id) return;
    axios.get(`${API_URL}/api/users`).then((res) => {
      setUsers(res.data.filter((u) => u._id !== me._id));
    });
  }, [me?._id]);

  /* ---------- MESSAGES ---------- */
  useEffect(() => {
    if (!selectedUser) return;

    axios
      .get(`${API_URL}/api/messages/${me._id}/${selectedUser._id}`)
      .then((res) => {
        setMessages(res.data);
        const unseenIds = res.data
          .filter(
            (m) =>
              m.senderId === selectedUser._id && m.status !== "seen"
          )
          .map((m) => m._id);

        if (unseenIds.length) {
          socketRef.current.emit("messageSeen", {
            senderId: selectedUser._id,
            messageIds: unseenIds,
          });
        }
      });

    setTyping(false);
  }, [selectedUser, me?._id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!text.trim() || !selectedUser) return;

    const res = await axios.post(`${API_URL}/api/send`, {
      senderId: me._id,
      receiverId: selectedUser._id,
      text,
    });

    setMessages((prev) => [...prev, res.data]);
    socketRef.current.emit("sendMessage", res.data);
    socketRef.current.emit("stopTyping", {
      receiverId: selectedUser._id,
    });
    setText("");
  };

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

  const renderTicks = (msg) => {
    if (msg.status === "sent") return "✓";
    if (msg.status === "delivered") return "✓✓";
    if (msg.status === "seen")
      return <span className="text-green-300">✓✓</span>;
  };

  return (
    <div className="h-screen flex bg-black">
      <div className="w-1/3 bg-gray-900 border-r border-green-600">
        <div className="bg-green-600 text-black p-4 flex justify-between">
          <span>WhatsApp</span>
          <button onClick={logout} className="bg-red-600 px-2 py-1 text-xs rounded">
            Logout
          </button>
        </div>

        {users.map((u) => (
          <div
            key={u._id}
            onClick={() => setSelectedUser(u)}
            className="p-4 border-b border-gray-700 cursor-pointer hover:bg-gray-800"
          >
            <div className="text-green-400">{u.name}</div>
            <div className="text-xs text-green-600">
              {onlineUsers.includes(u._id)
                ? "online"
                : formatLastSeen(u.lastSeen)}
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 flex items-center justify-center text-green-600">
        Select a chat to start messaging
      </div>
    </div>
  );
}

export default WhatsApp;
