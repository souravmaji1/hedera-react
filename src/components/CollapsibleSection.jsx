// src/components/CollapsibleSection.jsx
import React, { useState } from "react";
import PropTypes from "prop-types";
import "./CollapsibleSection.css";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

function CollapsibleSection({ title, children, startOpen = false }) {
  const [isOpen, setIsOpen] = useState(startOpen);

  const toggleOpen = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <div className="collapsible-section">
      <div className="collapsible-header" onClick={toggleOpen}>
        <h2>{title}</h2>
        <span className="collapsible-icon">
          {isOpen ? <FaChevronUp /> : <FaChevronDown />}
        </span>
      </div>
      {/* Transición: mostrar/ocultar contenido */}
      {isOpen && <div className="collapsible-content">{children}</div>}
    </div>
  );
}

CollapsibleSection.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  startOpen: PropTypes.bool,
};

export default CollapsibleSection;
