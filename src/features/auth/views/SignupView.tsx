import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuthStore } from "../store/authStore"
import { APP_NAME } from "../../../config"
import { colors } from "../../../theme"

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
  background: colors.bg,
}

const cardStyle = {
  background: colors.bgSecondary,
  borderRadius: "20px",
  padding: "40px",
  width: "100%",
  maxWidth: "400px",
  display: "flex",
  flexDirection: "column" as const,
  gap: "16px",
}

const titleStyle = {
  color: colors.textPrimary,
  fontSize: "28px",
  margin: 0,
  textAlign: "center" as const,
}

const subtitleStyle = {
  color: colors.textSecondary,
  margin: 0,
  textAlign: "center" as const,
}

const errorStyle = {
  background: colors.danger,
  color: colors.card,
  padding: "12px",
  borderRadius: "10px",
}

const successStyle = {
  background: "#7A9A5C",
  color: colors.card,
  padding: "12px",
  borderRadius: "10px",
}

const inputStyle = {
  padding: "14px",
  borderRadius: "12px",
  border: `0.5px solid ${colors.border}`,
  background: colors.card,
  color: colors.textPrimary,
  fontSize: "16px",
}

const buttonStyle = {
  padding: "14px",
  borderRadius: "12px",
  border: "none",
  background: colors.accent,
  color: colors.card,
  fontSize: "16px",
  cursor: "pointer",
}

const linkStyle = {
  color: colors.textSecondary,
  textAlign: "center" as const,
  margin: 0,
}

const anchorStyle = {
  color: colors.accent,
}