// src/components/Modal.js
import React from 'react';
import './Modal.css';
import PropTypes from 'prop-types';

function Modal({ children, onClose }) {
  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="modal-close-button"
          onClick={onClose}
          aria-label="Cerrar modal"
        >
          &times;
        </button>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}

Modal.propTypes = {
  children: PropTypes.node.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default Modal;
