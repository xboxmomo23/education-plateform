// Authentication utilities and hardcoded users for development

export type UserRole = "student" | "teacher" | "admin" | "responsable"

export interface User {
  email: string
  password: string
  role: UserRole
  name: string
}

// Hardcoded users for development
export const DEMO_USERS: User[] = [
  {
    email: "eleve@example.com",
    password: "eleve123",
    role: "student",
    name: "Étudiant Demo",
  },
  {
    email: "prof@example.com",
    password: "prof123",
    role: "teacher",
    name: "Professeur Demo",
  },
  {
    email: "admin@example.com",
    password: "admin123",
    role: "admin",
    name: "Administrateur Demo",
  },
  {
    email: "responsable1@test.com",
    password: "123456",
    role: "responsable",
    name: "Responsable 1",
  },
  {
    email: "responsable2@test.com",
    password: "123456",
    role: "responsable",
    name: "Responsable 2",
  },
]

export function authenticateUser(email: string, password: string): User | null {
  const user = DEMO_USERS.find((u) => u.email === email && u.password === password)
  return user || null
}

export function setUserSession(user: User) {
  if (typeof window !== "undefined") {
    localStorage.setItem("user", JSON.stringify(user))
  }
}

export function getUserSession(): User | null {
  if (typeof window !== "undefined") {
    const userStr = localStorage.getItem("user")
    if (userStr) {
      return JSON.parse(userStr)
    }
  }
  return null
}

export function clearUserSession() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("user")
  }
}
