const { createContext, useContext, useState, useEffect } = React;

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const cached = window.localStorage.getItem('todo-auth-user');
    return cached ? JSON.parse(cached) : null;
  });
  const [token, setToken] = useState(() => window.localStorage.getItem('todo-auth-token'));

  useEffect(() => {
    if (user && token) {
      window.localStorage.setItem('todo-auth-user', JSON.stringify(user));
      window.localStorage.setItem('todo-auth-token', token);
    } else {
      window.localStorage.removeItem('todo-auth-user');
      window.localStorage.removeItem('todo-auth-token');
    }
  }, [user, token]);

  const value = {
    user,
    token,
    login: (payload) => {
      setUser(payload.user);
      setToken(payload.token);
    },
    logout: () => {
      setUser(null);
      setToken(null);
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
}

window.authHook = { AuthProvider, useAuth };
