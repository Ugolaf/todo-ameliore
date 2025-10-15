const { useState } = React;
const { registerUser, loginUser } = window.apiClient || {};

export function AuthForms({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [role, setRole] = useState('parent');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    parentId: ''
  });
  const [parents, setParents] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (mode === 'register' && role === 'child') {
      loadParents();
    }
  }, [mode, role]);

  async function loadParents() {
    try {
      const cachedParents = window.sessionStorage.getItem('todo-parents-cache');
      if (cachedParents) {
        setParents(JSON.parse(cachedParents));
        return;
      }
      const response = await fetch('http://localhost:4000/mock-parents');
      if (response.ok) {
        const data = await response.json();
        setParents(data.parents || []);
        window.sessionStorage.setItem('todo-parents-cache', JSON.stringify(data.parents || []));
      }
    } catch (err) {
      console.warn('Impossible de charger la liste des parents de démonstration', err);
    }
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', password: '', parentId: '' });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        const payload = await loginUser({ email: formData.email, password: formData.password });
        onAuth(payload);
      } else {
        const payload = await registerUser({
          role,
          name: formData.name,
          email: formData.email,
          password: formData.password,
          parentId: role === 'child' ? formData.parentId : undefined
        });
        onAuth(payload);
      }
      resetForm();
    } catch (err) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section">
      <div className="tab-list">
        <button
          className={`tab-button ${mode === 'login' ? 'active' : ''}`}
          onClick={() => setMode('login')}
          type="button"
        >
          Connexion
        </button>
        <button
          className={`tab-button ${mode === 'register' ? 'active' : ''}`}
          onClick={() => setMode('register')}
          type="button"
        >
          Inscription
        </button>
      </div>

      <form onSubmit={handleSubmit} className="form">
        {mode === 'register' && (
          <div className="form-group">
            <label>Je suis...</label>
            <select name="role" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="parent">Un parent</option>
              <option value="child">Un enfant</option>
            </select>
          </div>
        )}

        {mode === 'register' && (
          <div className="form-group">
            <label htmlFor="name">Nom complet</label>
            <input id="name" name="name" value={formData.name} onChange={handleChange} required />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="email">Adresse e-mail</label>
          <input id="email" type="email" name="email" value={formData.email} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label htmlFor="password">Mot de passe</label>
          <input
            id="password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>

        {mode === 'register' && role === 'child' && (
          <div className="form-group">
            <label htmlFor="parentId">Identifiant du parent</label>
            <input
              id="parentId"
              name="parentId"
              value={formData.parentId}
              onChange={handleChange}
              required
              placeholder="Ex: par_abcd1234"
            />
            {parents.length > 0 && (
              <small>Parents disponibles: {parents.map((p) => p.id).join(', ')}</small>
            )}
          </div>
        )}

        {error && <div className="error">{error}</div>}

        <button className="button" type="submit" disabled={loading}>
          {loading ? 'Veuillez patienter...' : mode === 'login' ? 'Se connecter' : "Créer mon compte"}
        </button>
      </form>
    </div>
  );
}

window.AuthForms = AuthForms;
