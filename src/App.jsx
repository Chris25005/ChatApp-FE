import { useState, useEffect } from "react";
import Auth from "./pages/auth";
import WhatsApp from "./pages/Whatspp";

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const savedUser = JSON.parse(localStorage.getItem("user"));
      if (savedUser?._id) {
        setUser(savedUser);
      }
    } catch {
      localStorage.removeItem("user");
    }
  }, []);

  if (!user) return <Auth setUser={setUser} />;

  return <WhatsApp />;
}

export default App;
