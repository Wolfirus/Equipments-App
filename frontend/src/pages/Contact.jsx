import React, { useState } from "react";
import { messagesAPI } from "../services/api";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setOk("");
    setErr("");
    setLoading(true);

    try {
      await messagesAPI.send({
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
      });

      setOk("Message envoyé ✅");
      setName("");
      setEmail("");
      setMessage("");
    } catch (e2) {
      setErr(e2.message || "Erreur lors de l'envoi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Contact</h1>
      <p className="text-sm text-slate-600 mt-1">
        Envoyez-nous un message.
      </p>

      <div className="mt-6 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        {ok && (
          <div className="mb-4 bg-green-50 text-green-700 border border-green-200 rounded-xl px-4 py-3 text-sm">
            {ok}
          </div>
        )}
        {err && (
          <div className="mb-4 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm">
            {err}
          </div>
        )}

        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="text-xs font-semibold text-slate-700">Nom</label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Email</label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Message</label>
            <textarea
              className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>

          <button
            className="px-4 py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Envoi..." : "Envoyer"}
          </button>
        </form>
      </div>
    </div>
  );
}
