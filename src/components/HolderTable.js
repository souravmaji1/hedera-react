// src/components/HolderTable.js
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import wallets from './wallets'; // Importamos la lista de wallets con doxed y names
import './HolderTable.css'; // Opcional: estilos

function HolderTable({ data, decimals }) {
  // Ordenar balances en orden descendente
  const sortedData = [...data].sort((a, b) => b.balance - a.balance);
  const totalHodlers = sortedData.length; // Puedes usarlo si lo necesitas

  // Paginación
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageData = sortedData.slice(startIndex, endIndex);

  // Formatear balances con decimales (localización es-ES)
  const formatBalance = (rawBalance) => {
    const adjusted = rawBalance / Math.pow(10, decimals);
    return adjusted.toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Paginación: página anterior
  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  // Paginación: página siguiente
  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  // Cambiar cuántos items se muestran por página
  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  // Si la wallet está doxeada, mostramos el nombre doxeado
  const getDoxedName = (account) => {
    const wallet = wallets.find((w) => w.account === account);
    return wallet && wallet.doxed ? wallet.name : '-';
  };

  return (
    <div className="table-container">
      {/* Select para controlar los items por página */}
      <div className="items-per-page">
        <label style={{ marginRight: '8px' }}>Items por página:</label>
        <select
          value={itemsPerPage}
          onChange={handleItemsPerPageChange}
          style={{
            padding: '4px 8px',
            backgroundColor: '#1c1f24',
            color: '#fff',
            border: '1px solid #333',
            borderRadius: '4px',
          }}
        >
          <option value="10">10</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>DOXED</th>
            <th>Wallet ID</th>
            <th>Balance</th>
          </tr>
        </thead>
        <tbody>
          {pageData.length === 0 ? (
            <tr>
              <td colSpan="3">No hay balances disponibles.</td>
            </tr>
          ) : (
            pageData.map((holder, index) => (
              <tr key={index}>
                <td>{getDoxedName(holder.account)}</td>
                <td>{holder.account}</td>
                <td>{formatBalance(holder.balance)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Controles de paginación */}
      {sortedData.length > 0 && totalPages > 1 && (
        <div className="pagination-controls" style={{ marginTop: '1rem' }}>
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="pagination-button"
          >
            Anterior
          </button>
          <span style={{ margin: '0 1rem' }}>
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="pagination-button"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}

HolderTable.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      account: PropTypes.string.isRequired,
      balance: PropTypes.number.isRequired,
    })
  ).isRequired,
  decimals: PropTypes.number.isRequired,
};

export default HolderTable;
