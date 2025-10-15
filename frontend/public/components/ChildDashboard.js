const { useEffect, useState } = React;
const { fetchTasks, completeTask, fetchProgress } = window.apiClient || {};
const { useAuth } = window.authHook || {};

export function ChildDashboard() {
  const { token, user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!token) return;
    refreshData();
  }, [token]);

  async function refreshData() {
    setLoading(true);
    try {
      const [tasksResponse, progressResponse] = await Promise.all([
        fetchTasks(token),
        fetchProgress(token)
      ]);
      setTasks(tasksResponse.tasks || []);
      setSummary(progressResponse.summary || []);
      if (progressResponse.summary && progressResponse.summary.every((item) => item.status.completed)) {
        setMessage("Bravo ! Toutes tes tâches sont terminées pour aujourd'hui.");
      } else {
        setMessage(null);
      }
    } catch (err) {
      setMessage(err.message || 'Impossible de charger les tâches');
    } finally {
      setLoading(false);
    }
  }

  const handleComplete = async (taskId) => {
    try {
      await completeTask(token, taskId);
      await refreshData();
    } catch (err) {
      setMessage(err.message || "Impossible de mettre à jour la tâche");
    }
  };

  return (
    <div className="section">
      <header>
        <h2>Bonjour {user.name} 👋</h2>
        <p>Voici les missions du jour. Coche-les au fur et à mesure pour prévenir tes parents.</p>
      </header>

      {message && <div className="notification">{message}</div>}

      <div className="task-list">
        {tasks.length === 0 && <div className="empty-state">Tu n'as pas encore de tâches pour aujourd'hui.</div>}
        {tasks.map((task) => (
          <article className="task-item" key={task.id}>
            <div className="task-info">
              <h3>{task.title}</h3>
              <p>{task.description || 'Pas de description'}</p>
            </div>
            <div className="task-status">
              <span className={`badge ${task.status.completed ? 'success' : 'pending'}`}>
                {task.status.completed ? 'Terminée' : 'À faire'}
              </span>
              {!task.status.completed && (
                <button className="button" type="button" onClick={() => handleComplete(task.id)}>
                  Marquer comme faite
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      {loading && <div className="notification">Mise à jour...</div>}
    </div>
  );
}

window.ChildDashboard = ChildDashboard;
