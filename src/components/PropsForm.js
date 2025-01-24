// src/components/PropsForm.js
import React, { useState } from "react";
import { supabase } from "../config/supabaseClient";
import "./PropsForm.css"; // Crea este archivo para estilos personalizados si es necesario

function PropsForm() {
  const [activeTab, setActiveTab] = useState("Token");

  // Estados para el formulario de Token
  const [tokenId, setTokenId] = useState("");
  const [dexLink, setDexLink] = useState("");
  const [tokenMotivo, setTokenMotivo] = useState("");

  // Estados para el formulario de Doxed
  const [walletId, setWalletId] = useState("");
  const [dueño, setDueño] = useState("");
  const [soyYo, setSoyYo] = useState(false);
  const [doxear, setDoxear] = useState(false);

  // Estados para el formulario de Idea
  const [ideaWalletId, setIdeaWalletId] = useState("");
  const [ideaExplicacion, setIdeaExplicacion] = useState("");

  // Estado para manejar mensajes de éxito o error
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    try {
      if (activeTab === "Token") {
        if (!tokenId) {
          setError("Token_ID es obligatorio.");
          return;
        }

        const { data, error } = await supabase
          .from("props")
          .insert([
            {
              type: "Token",
              token_id: tokenId,
              dex_link: dexLink || null,
              motivo: tokenMotivo || null,
              created_at: new Date().toISOString(),
            },
          ]);

        if (error) throw error;

        setMessage("Prop de Token enviado exitosamente.");
        // Resetear campos
        setTokenId("");
        setDexLink("");
        setTokenMotivo("");
      } else if (activeTab === "Doxed") {
        if (!walletId || !dueño) {
          setError("Wallet_id y Dueño son obligatorios.");
          return;
        }

        const { data, error } = await supabase
          .from("props")
          .insert([
            {
              type: "Doxed",
              wallet_id: walletId,
              dueño,
              soy_yo: soyYo,
              doxear: doxear,
              created_at: new Date().toISOString(),
            },
          ]);

        if (error) throw error;

        setMessage("Prop de Doxed enviado exitosamente.");
        // Resetear campos
        setWalletId("");
        setDueño("");
        setSoyYo(false);
        setDoxear(false);
      } else if (activeTab === "Idea") {
        if (!ideaWalletId || !ideaExplicacion) {
          setError("Wallet_ID y Explicación de la idea son obligatorios.");
          return;
        }

        const { data, error } = await supabase
          .from("props")
          .insert([
            {
              type: "Idea",
              wallet_id: ideaWalletId,
              explicacion_idea: ideaExplicacion,
              created_at: new Date().toISOString(),
            },
          ]);

        if (error) throw error;

        setMessage("Prop de Idea enviado exitosamente.");
        // Resetear campos
        setIdeaWalletId("");
        setIdeaExplicacion("");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="props-form-container">
      <h2>Enviar Props</h2>
      <div className="tab-menu">
        <button
          className={`tab-button ${activeTab === "Token" ? "active" : ""}`}
          onClick={() => setActiveTab("Token")}
        >
          Token
        </button>
        <button
          className={`tab-button ${activeTab === "Doxed" ? "active" : ""}`}
          onClick={() => setActiveTab("Doxed")}
        >
          Doxed
        </button>
        <button
          className={`tab-button ${activeTab === "Idea" ? "active" : ""}`}
          onClick={() => setActiveTab("Idea")}
        >
          Idea
        </button>
      </div>

      <form onSubmit={handleSubmit} className="props-form">
        {activeTab === "Token" && (
          <div className="form-group">
            <label htmlFor="tokenId">Token_ID (obligatorio):</label>
            <input
              type="text"
              id="tokenId"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              required
            />

            <label htmlFor="dexLink">DEX Link (Swap or pool) (opcional):</label>
            <input
              type="text"
              id="dexLink"
              value={dexLink}
              onChange={(e) => setDexLink(e.target.value)}
              placeholder="https://dex.example.com/swap"
            />

            <label htmlFor="tokenMotivo">Motivo (opcional):</label>
            <textarea
              id="tokenMotivo"
              value={tokenMotivo}
              onChange={(e) => setTokenMotivo(e.target.value)}
              placeholder="Explica el motivo..."
            ></textarea>
          </div>
        )}

        {activeTab === "Doxed" && (
          <div className="form-group">
            <label htmlFor="walletId">Wallet_id (obligatorio):</label>
            <input
              type="text"
              id="walletId"
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              placeholder="0.0.xxxxxx"
              required
            />

            <label htmlFor="dueño">Dueño (obligatorio):</label>
            <input
              type="text"
              id="dueño"
              value={dueño}
              onChange={(e) => setDueño(e.target.value)}
              placeholder="Nombre del dueño"
              required
            />

            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={soyYo}
                  onChange={(e) => setSoyYo(e.target.checked)}
                />
                Soy yo
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={doxear}
                  onChange={(e) => setDoxear(e.target.checked)}
                />
                Doxear / eliminar doxed
              </label>
            </div>
          </div>
        )}

        {activeTab === "Idea" && (
          <div className="form-group">
            <label htmlFor="ideaWalletId">Wallet_ID (obligatorio):</label>
            <input
              type="text"
              id="ideaWalletId"
              value={ideaWalletId}
              onChange={(e) => setIdeaWalletId(e.target.value)}
              placeholder="0.0.xxxxxx"
              required
            />

            <label htmlFor="ideaExplicacion">Explicación de la idea (obligatorio):</label>
            <textarea
              id="ideaExplicacion"
              value={ideaExplicacion}
              onChange={(e) => setIdeaExplicacion(e.target.value)}
              placeholder="Describe tu idea en detalle..."
              required
            ></textarea>
          </div>
        )}

        {/* Mostrar mensajes de éxito o error */}
        {message && <p className="success-message">{message}</p>}
        {error && <p className="error-message">{error}</p>}

        <button type="submit" className="submit-button">
          Enviar
        </button>
      </form>
    </div>
  );
}

export default PropsForm;
