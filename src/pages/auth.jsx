import { useState } from "react";
import axios from "axios";

function Auth({ setUser }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    try {
      setLoading(true);

      if (isLogin) {

        const res = await axios.post(
          "http://localhost:1005/api/auth/login",
          { phone, password }
        );

     
        localStorage.setItem("user", JSON.stringify(res.data.user));
        setUser(res.data.user);

      } else {
      
        await axios.post(
          "http://localhost:1005/api/auth/register",
          { name, phone, password }
        );

        alert("Registered successfully. Please login.");
        setIsLogin(true);
        setName("");
        setPhone("");
        setPassword("");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-black">
      <div className="bg-gray-900 p-6 rounded w-80 shadow-lg border border-green-600">
        <h2 className="text-2xl font-bold mb-4 text-center text-green-400">
          {isLogin ? "Login" : "Register"}
        </h2>

        
        {!isLogin && (
          <input
            className="border border-green-600 bg-gray-800 text-green-400 p-2 w-full mb-2 rounded placeholder-green-600"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}

        <input
          className="border border-green-600 bg-gray-800 text-green-400 p-2 w-full mb-2 rounded placeholder-green-600"
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <input
          type="password"
          className="border border-green-600 bg-gray-800 text-green-400 p-2 w-full mb-4 rounded placeholder-green-600"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={submit}
          disabled={loading}
          className="bg-green-600 hover:bg-green-500 text-black font-bold w-full py-2 rounded disabled:opacity-60 transition-colors"
        >
          {loading ? "Please wait..." : isLogin ? "Login" : "Register"}
        </button>

        <p
          className="text-center text-green-400 hover:text-green-300 mt-3 cursor-pointer transition-colors"
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin
            ? "New user? Register"
            : "Already have an account? Login"}
        </p>
      </div>
    </div>
  );
}

export default Auth;
