import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";

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

  const formatTime = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatLastSeen = (date) => {
    if (!date) return "";

    const d = new Date(date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();

    return isToday
      ? `last seen today at ${d.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`
      : `last seen on ${d.toLocaleDateString()} at ${d.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`;
  };


  useEffect(() => {
    selectedUserRef.current = selectedUser?._id;
  }, [selectedUser]);


  const logout = () => {
    localStorage.removeItem("user");
    window.location.reload();
  };

  useEffect(() => {
    if (!me?._id) return;

    socketRef.current = io("http://localhost:1005", {
      transports: ["websocket"],
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

  useEffect(() => {
    if (!me?._id) return;

    axios.get("http://localhost:1005/api/users").then((res) => {
      setUsers(res.data.filter((u) => u._id !== me._id));
    });
  }, [me?._id]);

  useEffect(() => {
    if (!selectedUser) return;

    axios
      .get(
        `http://localhost:1005/api/messages/${me._id}/${selectedUser._id}`
      )
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

    const res = await axios.post("http://localhost:1005/api/send", {
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
    }, 1000);
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
        <div className="bg-green-600 text-black p-4 font-semibold flex justify-between items-center">
          <span>WhatsApp</span>
          <div className="flex items-center gap-3">
            <span className="text-sm">{me?.name}</span>
            <button
              onClick={logout}
              className="text-xs bg-red-600 hover:bg-red-500 px-2 py-1 rounded transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {users.map((user) => (
          <div
            key={user._id}
            onClick={() => setSelectedUser(user)}
            className={`p-4 border-b border-gray-700 cursor-pointer hover:bg-gray-800 transition-colors ${
              selectedUser?._id === user._id ? "bg-gray-800 border-l-4 border-l-green-600" : ""
            }`}
          >
            <div className="font-medium text-green-400">{user.name}</div>
            <div className="text-xs text-green-600">
              {onlineUsers.includes(user._id)
                ? "online"
                : formatLastSeen(user.lastSeen)}
            </div>
          </div>
        ))}
      </div>

      
      <div className="flex-1 flex flex-col bg-black">
        {selectedUser ? (
          <>
            <div className="bg-gray-900 p-4 border-b border-green-600">
              <div className="font-semibold text-green-400">{selectedUser.name}</div>

              {onlineUsers.includes(selectedUser._id) ? (
                <div className="text-xs text-green-400">online</div>
              ) : (
                <div className="text-xs text-green-600">
                  {formatLastSeen(selectedUser.lastSeen)}
                </div>
              )}

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
                    <div className={`flex justify-end items-center gap-1 text-[10px] mt-1 ${msg.senderId === me._id ? "text-black" : "text-green-500"}`}>
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
                className="flex-1 px-4 py-2 rounded-full outline-none bg-gray-800 text-green-400 placeholder-green-600 border border-green-600"
                placeholder="Type a message"
              />
              <button
                onClick={sendMessage}
                className="ml-2 bg-green-600 hover:bg-green-500 text-black px-4 py-2 rounded-full font-bold transition-colors"
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
