import React, { useEffect, useState } from "react";
import axios from "axios";

export default function AdminMessages() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    fetchMessages();
  }, []);
  const deleteMessage = async (id) => {
  if (!window.confirm("Voulez-vous vraiment supprimer ce message ?")) return;

  try {
    await axios.delete(`http://localhost:5000/api/messages/${id}`);
    setMessages(messages.filter((msg) => msg._id !== id));
  } catch (err) {
    console.error(err);
    alert("Erreur lors de la suppression");
  }
};


  const fetchMessages = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/messages");
      setMessages(res.data.data);
    } catch (error) {
      console.error(error);
      alert("Erreur lors du chargement des messages");
    }
  };

  return (
    <div className="page-container">
      <div className="glass-card">
        <h1>Messages reçus</h1>

        {messages.length === 0 ? (
          <p>Aucun message pour le moment.</p>
        ) : (
          <div className="messages-list">
            {messages.map((msg) => (
              <div key={msg._id} className="message-item">
                <h3>{msg.name} ({msg.email})</h3>
                <p>{msg.message}</p>
                <small>Reçu le : {new Date(msg.date).toLocaleString()}</small>
                <button className="btn-delete" onClick={() => deleteMessage(msg._id)}>
                    Supprimer
                </button>

                <hr />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    
  );
}
