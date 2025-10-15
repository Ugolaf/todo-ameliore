const { AuthProvider, useAuth } = window.authHook;
const { AuthForms } = window;
const { ParentDashboard } = window;
const { ChildDashboard } = window;

function App() {
  const { user, logout, login } = useAuth();

  if (!user) {
    return (
      <div className="card">
        <aside className="sidebar">
          <h1>Todo Amélioré</h1>
          <p>
            Organisez la vie quotidienne de la famille, créez des routines ludiques et suivez les réussites de chacun en un clin
            d'œil.
          </p>
        </aside>
        <main className="main">
          <AuthForms onAuth={login} />
        </main>
      </div>
    );
  }

  return (
    <div className="card">
      <aside className="sidebar">
        <h1>Bonjour {user.name}</h1>
        <p>{user.role === 'parent' ? 'Tableau de bord parent' : 'Espace enfant'}</p>
        <button className="button" type="button" onClick={logout}>
          Se déconnecter
        </button>
      </aside>
      <main className="main">{user.role === 'parent' ? <ParentDashboard /> : <ChildDashboard />}</main>
    </div>
  );
}

function Root() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Root />);
