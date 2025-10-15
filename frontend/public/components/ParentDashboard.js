const { useEffect, useState } = React;
const { fetchChildren, fetchTasks, createTask, fetchProgress } = window.apiClient || {};
const { useAuth } = window.authHook || {};

export function ParentDashboard() {
  const { token, user } = useAuth();
  const [children, setChildren] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({ title: '', description: '', childId: '' });

  useEffect(() => {
    if (!token) return;
    refreshData();
  }, [token]);

  async function refreshData() {
    try {
      setLoading(true);
      const [childrenResponse, tasksResponse, progressResponse] = await Promise.all([
        fetchChildren(token),
        fetchTasks(token),
        fetchProgress(token)
      ]);
      setChildren(childrenResponse.children || []);
      setTasks(tasksResponse.tasks || []);
      setProgress(progressResponse.summaries || []);
      if (!formData.childId && childrenResponse.children && childrenResponse.children.length > 0) {
        setFormData((prev) => ({ ...prev, childId: childrenResponse.children[0].id }));
      }
    } catch (err) {
      setError(err.message || 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    try {
      if (!formData.childId) {
        setError('Sélectionnez un enfant pour attribuer la tâche.');
        return;
      }
      await createTask(token, formData);
      setFormData({ title: '', description: '', childId: formData.childId });
      await refreshData();
    } catch (err) {
      setError(err.message || "Impossible de créer la tâche");
    }
  };

  return (
    <div className="section">
      <header>
        <h2>Bienvenue {user.name}</h2>
        <p>Créez des tâches quotidiennes et suivez la progression de vos enfants en temps réel.</p>
      </header>

      <form onSubmit={handleSubmit} className="form" style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
        <div className="form-group">
          <label htmlFor="childId">Attribuer à</label>
          <select id="childId" name="childId" value={formData.childId} onChange={handleChange}>
            <option value="">Sélectionnez un enfant</option>
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.name} ({child.id})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="title">Titre</label>
          <input id="title" name="title" value={formData.title} onChange={handleChange} placeholder="Ex: Ranger la chambre" required />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            rows="3"
            value={formData.description}
            onChange={handleChange}
            placeholder="Ajoutez un message pour motiver votre enfant"
          />
        </div>

        <button className="button" type="submit">Ajouter la tâche</button>
      </form>

      {error && <div className="error">{error}</div>}

      <section className="section" style={{ marginTop: '2rem' }}>
        <h3>Tâches assignées</h3>
        <div className="task-list">
          {tasks.length === 0 && <div className="empty-state">Aucune tâche pour le moment. Ajoutez la première !</div>}
          {tasks.map((task) => (
            <article className="task-item" key={task.id}>
              <div className="task-info">
                <h3>{task.title}</h3>
                <p>{task.description || 'Pas de description'}</p>
                <small>Enfant: {children.find((c) => c.id === task.childId)?.name || task.childId}</small>
              </div>
              <div className="task-status">
                <span className={`badge ${task.status.completed ? 'success' : 'pending'}`}>
                  {task.status.completed ? 'Terminée' : 'En attente'}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section" style={{ marginTop: '2rem' }}>
        <h3>Suivi quotidien</h3>
        <div className="task-list">
          {progress.length === 0 && <div className="empty-state">Invitez vos enfants pour commencer le suivi.</div>}
          {progress.map((entry) => (
            <article className="task-item" key={entry.child.id}>
              <div className="task-info">
                <h3>{entry.child.name}</h3>
                <p>{entry.completedAll ? 'Toutes les tâches sont terminées pour aujourd\'hui !' : 'Tâches en cours...'}</p>
              </div>
              <div className="task-status">
                <span className={`badge ${entry.completedAll ? 'success' : 'pending'}`}>
                  {entry.completedAll ? 'Complété' : 'En cours'}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {loading && <div className="notification">Actualisation en cours...</div>}
    </div>
  );
}

window.ParentDashboard = ParentDashboard;
