// src/components/NFTFriends.js
import React, { useState } from "react";
import PropTypes from "prop-types";
import "./NFTFriends.css";

function NFTFriends({ nftTokens, addNftToken, deleteNftToken }) {
  const [newTokenId, setNewTokenId] = useState("");
  const [newTokenName, setNewTokenName] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState(null); // Estado para manejar la eliminación

  const handleAddToken = async (e) => {
    e.preventDefault();

    // Validaciones básicas
    if (!newTokenId.trim() || !newTokenName.trim()) {
      alert("Por favor, completa ambos campos.");
      return;
    }

    // Validar formato del Token ID (ejemplo: 0.0.123456)
    const tokenIdRegex = /^0\.0\.\d+$/;
    if (!tokenIdRegex.test(newTokenId.trim())) {
      alert("El Token ID debe tener el formato '0.0.xxxxxx'.");
      return;
    }

    setAdding(true);
    await addNftToken({ id: newTokenId.trim(), name: newTokenName.trim() });
    setAdding(false);

    // Limpiar campos después de agregar
    setNewTokenId("");
    setNewTokenName("");
  };

  const handleDeleteToken = async (id) => {
    const confirmDelete = window.confirm(
      "¿Estás seguro de que deseas eliminar este NFT amigo?"
    );
    if (!confirmDelete) return;

    setDeletingId(id);
    await deleteNftToken(id);
    setDeletingId(null);
  };

  return (
    <div className="nft-friends-container">
      <h2>NFTs Amigos</h2>

      {/* Lista de NFTs Amigos */}
      <div className="nft-list">
        {nftTokens.length === 0 ? (
          <p>No hay NFTs amigos registrados.</p>
        ) : (
          <table className="nft-table">
            <thead>
              <tr>
                <th>Token ID</th>
                <th>Nombre</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {nftTokens.map((token) => (
                <tr key={token.id}>
                  <td>{token.id}</td>
                  <td>{token.name}</td>
                  <td>
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteToken(token.id)}
                      disabled={deletingId === token.id}
                      title="Eliminar NFT Amigo"
                    >
                      {deletingId === token.id ? "Eliminando..." : "Eliminar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Formulario para agregar un nuevo NFT Amigo */}
      <div className="add-nft-form">
        <h3>Agregar Nuevo NFT Amigo</h3>
        <form onSubmit={handleAddToken}>
          <div className="form-group">
            <label htmlFor="tokenId">Token ID:</label>
            <input
              type="text"
              id="tokenId"
              value={newTokenId}
              onChange={(e) => setNewTokenId(e.target.value)}
              placeholder="Ej. 0.0.123456"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="tokenName">Nombre:</label>
            <input
              type="text"
              id="tokenName"
              value={newTokenName}
              onChange={(e) => setNewTokenName(e.target.value)}
              placeholder="Ej. Guille Miembro"
              required
            />
          </div>
          <button type="submit" className="btn-add" disabled={adding}>
            {adding ? "Agregando..." : "Agregar NFT Amigo"}
          </button>
        </form>
      </div>
    </div>
  );
}

NFTFriends.propTypes = {
  nftTokens: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    })
  ).isRequired,
  addNftToken: PropTypes.func.isRequired,
  deleteNftToken: PropTypes.func.isRequired,
};

export default NFTFriends;
