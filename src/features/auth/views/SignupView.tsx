import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuthStore } from "../store/authStore"
import { APP_NAME } from "../../../config"

export default function SignupView() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const signUp = useAuthStore((state) => state.signUp)
  const navigate = useNavigate()

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) return
    const error = await signUp(email, password)
    if (error) {
      setError(error)
      return
    }
    setSuccess(true)
    setTimeout(() => navigate("/login"), 2000)
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>{APP_NAME}</h1>
        <p style={subtitleStyle}>Create your account</p>

        {error && <div style={errorStyle}>{error}</div>}

        {success && (
          <div style={successStyle}>
            Account created! Check your email to confirm.
          </div>
        )}

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
          Sign up
        </button>

        <p style={linkStyle}>
          Already have an account?{" "}
          <Link to="/login" style={anchorStyle}>
            Sign in
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

const successStyle = {
  background: "#166534",
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