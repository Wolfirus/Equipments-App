import React, { useEffect, useState } from "react";
import axios from "axios";
import CenterAlert from "../components/CenterAlert";

export default function AdminMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:5000/api/messages");
      setMessages(res.data.data);
    } catch (error) {
      console.error(error);
      setAlert({
        message: "Erreur lors du chargement des messages",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteMessage = async (id) => {
    // confirmation UX centrée
    setAlert({
      message: "Confirmer la suppression de ce message ?",
      type: "error",
    });

    // délai court pour laisser lire le message
    setTimeout(async () => {
      try {
        await axios.delete(`http://localhost:5000/api/messages/${id}`);
        setMessages((prev) => prev.filter((msg) => msg._id !== id));

        setAlert({
          message: "Message supprimé avec succès 🗑️",
          type: "success",
        });
      } catch (err) {
        console.error(err);
        setAlert({
          message: "Erreur lors de la suppression du message",
          type: "error",
        });
      }
    }, 1200);
  };

  return (
    <div className="page-container">
      <div className="glass-card">
        <h1>Messages reçus</h1>

        {loading && <p>Chargement...</p>}

        {!loading && messages.length === 0 ? (
          <p>Aucun message pour le moment.</p>
        ) : (
          <div className="messages-list">
            {messages.map((msg) => (
              <div key={msg._id} className="message-item">
                <h3>
                  {msg.name} ({msg.email})
                </h3>
                <p>{msg.message}</p>
                <small>
                  Reçu le : {new Date(msg.date).toLocaleString()}
                </small>

                <button
                  className="btn-delete"
                  onClick={() => deleteMessage(msg._id)}
                >
                  Supprimer
                </button>

                <hr />
              </div>
            ))}
          </div>
        )}
      </div>

      {alert && (
        <CenterAlert
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert(null)}
        />
      )}
    </div>
  );
}
