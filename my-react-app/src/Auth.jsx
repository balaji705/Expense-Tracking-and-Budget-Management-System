
import { useState } from "react";
import axios from "axios";
import { Wallet } from "lucide-react";

const API = "http://localhost:5000/api/auth";

export default function Auth({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        await axios.post(`${API}/register`, {
          name,
          email,
          password,
        });
      }

      const response = await axios.post(`${API}/login`, {
        email,
        password,
      });

      onLogin(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to authenticate."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-logo">
          <Wallet size={30} />
        </div>

        <h1>SpendWise</h1>
        <p className="muted">
          {isRegister
            ? "Create your personal finance account"
            : "Welcome back! Sign in to continue"}
        </p>

        {error && <div className="error-banner">{error}</div>}

        {isRegister && (
          <label>
            Full name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              placeholder="Your name"
            />
          </label>
        )}

        <label>
          Email address
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete={
              isRegister ? "new-password" : "current-password"
            }
            placeholder="At least 8 characters"
          />
        </label>

        <button
          type="submit"
          className="primary-btn"
          disabled={loading}
        >
          {loading
            ? "Please wait..."
            : isRegister
              ? "Create Account"
              : "Sign In"}
        </button>

        <p className="auth-switch">
          {isRegister
            ? "Already have an account?"
            : "Don't have an account?"}{" "}
          <button
            type="button"
            className="text-btn"
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
          >
            {isRegister ? "Sign In" : "Register"}
          </button>
        </p>
      </form>
    </div>
  );
}

