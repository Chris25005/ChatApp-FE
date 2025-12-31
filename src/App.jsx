import { useState, useEffect } from "react";
import Auth from "./pages/auth";
import WhatsApp from "./pages/Whatspp";

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem("user"));
    if (savedUser && savedUser._id) {
      setUser(savedUser);
    }
  }, []);

  if (!user) {
    return <Auth setUser={setUser} />;
  }

  
  return <WhatsApp />;
}

export default App;
