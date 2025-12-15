import { useEffect, useMemo, useState } from "react";
import {
  getReservations,
  approveReservation,
  rejectReservation,
} from "../api/reservations";

export default function SupervisorReservations() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [status, setStatus] = useState(""); // pending/approved/active/cancelled/completed
  const [search, setSearch] = useState(""); // recherche côté client (simple)
  const [notes, setNotes] = useState({}); // notes par id

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      // filtre serveur (status) + pagination si tu veux après
      const res = await getReservations(status ? { status } : {});
      const reservations = res?.data?.data?.reservations || [];
      setItems(reservations);
    } catch (e) {
      console.error(e);
      setError("Impossible de charger les réservations (vérifie backend/token).");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [status]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((r) => {
      const equip = r.equipment_id?.name?.toLowerCase() || "";
      const user = r.user_id?.name?.toLowerCase() || "";
      const purpose = r.purpose?.toLowerCase() || "";
      return equip.includes(q) || user.includes(q) || purpose.includes(q);
    });
  }, [items, search]);

  const onApprove = async (id) => {
    try {
      await approveReservation(id, notes[id] || "");
      await fetchData();
    } catch (e) {
      console.error(e);
      alert("Erreur: approbation impossible (droits / API).");
    }
  };

  const onReject = async (id) => {
    try {
      await rejectReservation(id, notes[id] || "");
      await fetchData();
    } catch (e) {
      console.error(e);
      alert("Erreur: refus impossible (droits / API).");
    }
  };

  if (loading) return <div className="loading-box">Chargement...</div>;
  if (error) return <div className="error-box">{error}</div>;

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Réservations (Superviseur)</h2>

        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher équipement / utilisateur / motif…"
            style={{ padding: 10, minWidth: 320 }}
          />

          <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: 10 }}>
            <option value="">Tous statuts</option>
            <option value="pending">En attente</option>
            <option value="approved">Approuvée</option>
            <option value="active">Active</option>
            <option value="completed">Terminée</option>
            <option value="cancelled">Annulée</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ opacity: 0.8 }}>Aucune réservation.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th style={th}>Équipement</th>
                <th style={th}>Utilisateur</th>
                <th style={th}>Début</th>
                <th style={th}>Fin</th>
                <th style={th}>Qté</th>
                <th style={th}>Motif</th>
                <th style={th}>Statut</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const canAct = r.status === "pending"; // actions seulement si en attente
                return (
                  <tr key={r._id}>
                    <td style={td}>{r.equipment_id?.name || "-"}</td>
                    <td style={td}>{r.user_id?.name || "-"}</td>
                    <td style={td}>{fmtDate(r.start_date)}</td>
                    <td style={td}>{fmtDate(r.end_date)}</td>
                    <td style={td}>{r.quantity ?? 1}</td>
                    <td style={td}>{r.purpose || "-"}</td>
                    <td style={td}>{badge(r.status)}</td>
                    <td style={td}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <input
                          value={notes[r._id] || ""}
                          onChange={(e) => setNotes((p) => ({ ...p, [r._id]: e.target.value }))}
                          placeholder="Note (optionnelle)…"
                          style={{ padding: 8 }}
                          disabled={!canAct}
                        />
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => onApprove(r._id)}
                            disabled={!canAct}
                            style={btn(canAct)}
                          >
                            Approuver
                          </button>
                          <button
                            onClick={() => onReject(r._id)}
                            disabled={!canAct}
                            style={btn(canAct, true)}
                          >
                            Refuser
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th = { padding: "12px 10px", borderBottom: "1px solid rgba(255,255,255,0.1)" };
const td = { padding: "12px 10px", borderBottom: "1px solid rgba(255,255,255,0.08)", verticalAlign: "top" };

function fmtDate(v) {
  try {
    return new Date(v).toLocaleString();
  } catch {
    return "-";
  }
}

function badge(status) {
  const map = {
    pending: "En attente",
    approved: "Approuvée",
    active: "Active",
    completed: "Terminée",
    cancelled: "Annulée",
  };
  return map[status] || status || "-";
}

function btn(enabled, danger = false) {
  return {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.15)",
    cursor: enabled ? "pointer" : "not-allowed",
    opacity: enabled ? 1 : 0.5,
    background: danger ? "rgba(255,0,0,0.15)" : "rgba(0,160,255,0.15)",
    color: "white",
  };
}
