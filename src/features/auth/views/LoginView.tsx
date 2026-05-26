import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuthStore } from "../store/authStore"
import { APP_NAME } from "../../../config"

export default function LoginView() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const signIn = useAuthStore((state) => state.signIn)
  const navigate = useNavigate()

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) return
    const error = await signIn(email, password)
    if (error) {
      setError(error)
      return
    }
    navigate("/collection")
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>{APP_NAME}</h1>
        <p style={subtitleStyle}>Sign in to your account</p>

        {error && <div style={errorStyle}>{error}</div>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />

        <button onClick={handleSubmit} style={buttonStyle}>
          Sign in
        </button>

        <p style={linkStyle}>
          No account?{" "}
          <Link to="/signup" style={anchorStyle}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}

const containerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: "100vh",
  background: "#111111",
}

const cardStyle = {
  background: "#1E1E1E",
  borderRadius: "20px",
  padding: "40px",
  width: "100%",
  maxWidth: "400px",
  display: "flex",
  flexDirection: "column" as const,
  gap: "16px",
}

const titleStyle = {
  color: "white",
  fontSize: "28px",
  margin: 0,
  textAlign: "center" as const,
}

const subtitleStyle = {
  color: "#888",
  margin: 0,
  textAlign: "center" as const,
}

const errorStyle = {
  background: "#991B1B",
  color: "white",
  padding: "12px",
  borderRadius: "10px",
}

const inputStyle = {
  padding: "14px",
  borderRadius: "12px",
  border: "none",
  background: "#111111",
  color: "white",
  fontSize: "16px",
}

const buttonStyle = {
  padding: "14px",
  borderRadius: "12px",
  border: "none",
  background: "#2563EB",
  color: "white",
  fontSize: "16px",
  cursor: "pointer",
}

const linkStyle = {
  color: "#888",
  textAlign: "center" as const,
  margin: 0,
}

const anchorStyle = {
  color: "#2563EB",
}