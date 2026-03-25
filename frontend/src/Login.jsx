import { useState } from "react";

export default function Login({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ username: "", password: "" });

  const handleSubmit = () => {
    if (form.username === "admin" && form.password === "admin123") {
      localStorage.setItem("token", "dummy-token");
      onLogin();
    } else {
      alert("Invalid credentials");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0d1117] via-[#0f172a] to-[#020617] relative overflow-hidden">
      
      <div className="absolute w-[400px] h-[400px] bg-blue-500/20 blur-3xl rounded-full top-[-100px] left-[-100px]" />
      <div className="absolute w-[300px] h-[300px] bg-purple-500/20 blur-3xl rounded-full bottom-[-80px] right-[-80px]" />

      <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 p-8 rounded-2xl shadow-2xl w-[380px]">

        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🫀</div>
          <h2 className="text-2xl font-semibold text-white">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            {isLogin ? "Sign in to continue" : "Start your health journey"}
          </p>
        </div>

        <div className="space-y-4">
          <input
            placeholder="Username"
            className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            onChange={(e) =>
              setForm({ ...form, username: e.target.value })
            }
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            onChange={(e) =>
              setForm({ ...form, password: e.target.value })
            }
          />
        </div>

        <button
          onClick={handleSubmit}
          className="w-full mt-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:opacity-90 text-white font-semibold transition"
        >
          {isLogin ? "Sign In" : "Register"}
        </button>

        <p
          className="text-gray-400 text-sm mt-5 text-center cursor-pointer hover:text-white transition"
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin
            ? "Don't have an account? Register"
            : "Already have an account? Login"}
        </p>
      </div>
    </div>
  );
}