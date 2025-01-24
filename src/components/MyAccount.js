// src/components/MyAccount.js

import React, { useEffect, useState } from "react";
import { supabase } from "../config/supabaseClient";
import "./MyAccount.css";
import promoImage from "../assets/promo.png";
import promoIcon from "../assets/path_to_promo_icon.gif";
import { useWallet } from "@buidlerlabs/hashgraph-react-wallets";
import { TransferTransaction, AccountId, Hbar, Status } from "@hashgraph/sdk";
import { logSearch } from "../utils/logger";
import Modal from "../components/Modal";
import { FaCopy } from "react-icons/fa"; // Importar ícono de copiar

function MyAccount({ accountId }) {
  const [saldo, setSaldo] = useState(0);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { signer, isConnected } = useWallet();
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({
    title: "",
    message: "",
    type: "",
    icon: "",
  });
  const [referralLink, setReferralLink] = useState("");

  // Estado para manejar la copia del enlace
  const [copied, setCopied] = useState(false);

  const showModalWithContent = (title, message, type = "success") => {
    setModalContent({
      title,
      message,
      type,
      icon: type === "success" ? "✅" : type === "error" ? "❌" : "⚠️",
    });
    setShowModal(true);
  };

  // Función para verificar y crear el wallet, incluyendo la lógica de referidos
  const checkAndCreateWallet = async () => {
    try {
      console.log("Verificando existencia de wallet para:", accountId);
      // Verificar si existe el wallet
      const { data: existingWallet, error: checkError } = await supabase
        .from("wallets")
        .select("*")
        .eq("wallet_id", accountId)
        .single();

      if (checkError) {
        if (checkError.code === "PGRST116") {
          // Wallet no existe, proceder a creación
          await handleNewWalletCreation();
        } else {
          // Otro tipo de error
          console.error("Error al verificar la wallet:", checkError.message);
          showModalWithContent(
            "Error",
            "Hubo un problema al verificar tu wallet.",
            "error"
          );
        }
      } else if (existingWallet) {
        // Wallet existe, establecer el saldo
        setSaldo(parseFloat(existingWallet.saldo));
      }
    } catch (error) {
      console.error("Error en checkAndCreateWallet:", error.message);
      showModalWithContent(
        "Error",
        "Hubo un problema inesperado al verificar tu wallet.",
        "error"
      );
    }
  };

  // Función para manejar la creación de una nueva wallet
  const handleNewWalletCreation = async () => {
    try {
      console.log("Creando nueva wallet para:", accountId);
      // Detectar si hay un parámetro de referido en la URL
      const urlParams = new URLSearchParams(window.location.search);
      const referrerId = urlParams.get("ref");

      let initialSaldo = 10; // Saldo por defecto
      let isReferred = false;

      // Validar el referrerId si existe
      if (referrerId && referrerId !== accountId) {
        console.log("Referrer ID detectado:", referrerId);
        // Verificar si el referrer existe
        const { data: referrerWallet, error: refError } = await supabase
          .from("wallets")
          .select("*")
          .eq("wallet_id", referrerId)
          .single();

        if (!refError && referrerWallet) {
          isReferred = true;
          initialSaldo += 3; // 10 + 3 = 13 usos para el referido
          console.log("Usuario referido. Saldo inicial:", initialSaldo);
        } else {
          console.warn("Referrer inválido o inexistente.");
        }
      }

      // Crear la nueva wallet
      const { error: createError } = await supabase.from("wallets").insert([
        {
          wallet_id: accountId,
          saldo: initialSaldo,
          referrer_id: isReferred ? referrerId : null,
        },
      ]);

      if (createError) {
        console.error("Error creando la wallet:", createError.message);
        throw createError;
      }

      // Si el usuario fue referido, manejar la inserción en referrals y actualizar el saldo del referidor
      if (isReferred) {
        console.log("Insertando referencia en 'referrals'");
        // Insertar en la tabla 'referrals' solo si no existe ya
        const { data: existingReferral, error: referralCheckError } = await supabase
          .from("referrals")
          .select("*")
          .eq("referrer_id", referrerId)
          .eq("referee_id", accountId)
          .single();

        if (referralCheckError && referralCheckError.code === "PGRST116") {
          // No existe la referencia, crear una nueva
          console.log("Referencia no existente. Insertando nueva referencia.");
          const { error: referralInsertError } = await supabase
            .from("referrals")
            .insert([
              {
                referrer_id: referrerId,
                referee_id: accountId,
              },
            ]);

          if (referralInsertError) {
            console.error("Error insertando la referencia:", referralInsertError.message);
            throw referralInsertError;
          }

          // Actualizar el saldo del referidor
          console.log("Actualizando saldo del referidor:", referrerId);
          const { data: referrerWallet, error: refUpdateError } = await supabase
            .from("wallets")
            .select("*")
            .eq("wallet_id", referrerId)
            .single();

          if (refUpdateError || !referrerWallet) {
            console.error("Error al obtener el saldo del referidor:", refUpdateError?.message);
            throw refUpdateError || new Error("Referidor no encontrado.");
          }

          const { error: updateReferrerSaldoError } = await supabase
            .from("wallets")
            .update({ saldo: referrerWallet.saldo + 5 })
            .eq("wallet_id", referrerId);

          if (updateReferrerSaldoError) {
            console.error("Error actualizando el saldo del referidor:", updateReferrerSaldoError.message);
            throw updateReferrerSaldoError;
          }

          // Mostrar modal al referidor informando de la nueva referencia
          await showNewReferralModal(referrerId);
        } else {
          console.log("La referencia ya existe. No se insertará nuevamente.");
        }
      }

      // Establecer el saldo del nuevo usuario
      setSaldo(initialSaldo);

      // Mostrar mensajes de bienvenida
      if (isReferred) {
        showModalWithContent(
          "¡Bienvenido! 🎉",
          `
            <div class="success-modal-content">
              <div class="welcome-message">
                <h3>¡Gracias por unirte a nuestra DAPP!</h3>
                <div class="bonus-details">
                  <p>Te hemos otorgado <span class="highlight">13 usos</span> para que explores todas nuestras funcionalidades.</p>
                  <div class="celebration-icon">🎊</div>
                </div>
                <div class="balance-info">
                  <span class="label">Tu balance inicial:</span>
                  <span class="value">13 usos</span>
                </div>
              </div>
            </div>
          `,
          "success"
        );

        showModalWithContent(
          "¡Has sido Referido! 🎉",
          `
            <div class="success-modal-content">
              <div class="welcome-message">
                <h3>¡Gracias por unirte a nuestra DAPP!</h3>
                <div class="bonus-details">
                  <p>Has recibido <span class="highlight">13 usos</span> para que explores todas nuestras funcionalidades.</p>
                  <div class="celebration-icon">🎊</div>
                </div>
                <div class="balance-info">
                  <span class="label">Tu balance inicial:</span>
                  <span class="value">13 usos</span>
                </div>
              </div>
            </div>
          `,
          "success"
        );
      } else {
        showModalWithContent(
          "¡Bienvenido! 🎉",
          `
            <div class="success-modal-content">
              <div class="welcome-message">
                <h3>¡Gracias por unirte a nuestra DAPP!</h3>
                <div class="bonus-details">
                  <p>Te hemos otorgado <span class="highlight">10 usos gratuitos</span> para que explores todas nuestras funcionalidades.</p>
                  <div class="celebration-icon">🎊</div>
                </div>
                <div class="balance-info">
                  <span class="label">Tu balance inicial:</span>
                  <span class="value">10 usos</span>
                </div>
              </div>
            </div>
          `,
          "success"
        );
      }

      await logSearch(accountId, isReferred ? "welcome_bonus_referred" : "welcome_bonus");
    } catch (error) {
      console.error("Error en handleNewWalletCreation:", error.message);
      showModalWithContent(
        "Error",
        "Hubo un problema al crear tu wallet.",
        "error"
      );
    }
  };

  // Función para mostrar el modal al referidor
  const showNewReferralModal = async (referrerId) => {
    try {
      console.log("Mostrando modal para el referidor:", referrerId);
      // Verificar si ya se ha mostrado el modal para esta referencia
      const modalKey = `referralModal_${referrerId}_${accountId}`;
      const hasSeenModal = localStorage.getItem(modalKey);

      if (!hasSeenModal) {
        // Mostrar el modal
        showModalWithContent(
          "¡Nueva Referencia! 🎉",
          `
            <div class="success-modal-content">
              <div class="referral-message">
                <h3>¡Has recibido una nueva referencia!</h3>
                <p>Has otorgado <span class="highlight">5 usos adicionales</span> a tu cuenta por invitar a un nuevo usuario.</p>
                <div class="celebration-icon">🎊</div>
              </div>
            </div>
          `,
          "success"
        );

        // Marcar como visto
        localStorage.setItem(modalKey, "true");
      }
    } catch (error) {
      console.error("Error en showNewReferralModal:", error.message);
    }
  };

  // Función para obtener el saldo
  const fetchSaldo = async () => {
    try {
      const { data, error } = await supabase
        .from("wallets")
        .select("saldo")
        .eq("wallet_id", accountId)
        .single();

      if (error) {
        console.error("Error fetching saldo:", error.message);
        throw error;
      }
      setSaldo(parseFloat(data.saldo));
    } catch (error) {
      console.error("Error en fetchSaldo:", error.message);
    }
  };

  // Función para obtener el número total de referencias realizadas por el usuario
  const fetchReferralCount = async () => {
    try {
      const { count, error } = await supabase
        .from("referrals")
        .select("*", { count: "exact", head: true })
        .eq("referrer_id", accountId);

      if (error) {
        console.error("Error fetching referral count:", error.message);
        throw error;
      }

      const totalReferrals = count || 0;

      const acknowledgedReferrals = parseInt(localStorage.getItem("acknowledgedReferralCount")) || 0;

      const newReferrals = totalReferrals - acknowledgedReferrals;

      if (newReferrals > 0) {
        const bonus = newReferrals * 5;
        showModalWithContent(
          "¡Nuevas Referencias! 🎉",
          `Has recibido ${bonus} usos adicionales por ${newReferrals} nueva${newReferrals > 1 ? "s" : ""} referencia${newReferrals > 1 ? "s" : ""}.`,
          "success"
        );
        localStorage.setItem("acknowledgedReferralCount", totalReferrals);
      }
    } catch (error) {
      console.error("Error en fetchReferralCount:", error.message);
    }
  };

  useEffect(() => {
    if (accountId && isConnected) {
      checkAndCreateWallet();
      // Generar el enlace de referido
      const currentUrl = window.location.origin + window.location.pathname;
      const refLink = `${currentUrl}?ref=${accountId}`;
      setReferralLink(refLink);
    }
  }, [accountId, isConnected]);

  useEffect(() => {
    if (accountId && isConnected) {
      fetchReferralCount();
    }
  }, [accountId, isConnected, saldo]);

  const updateProgress = () => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 20;
      });
    }, 500); // Reducido a 500ms para una experiencia más rápida
    return () => clearInterval(interval);
  };

  const handlePayment = async (amount) => {
    if (!isConnected || !accountId) {
      showModalWithContent(
        "Error de Conexión",
        "Por favor conecta tu wallet primero.",
        "error"
      );
      return;
    }

    if (!signer) {
      showModalWithContent(
        "Error de Wallet",
        "No se ha podido obtener el signer de la wallet.",
        "error"
      );
      return;
    }

    setLoading(true);
    updateProgress();

    try {
      const transaction = new TransferTransaction()
        .addHbarTransfer(AccountId.fromString(accountId), new Hbar(-amount))
        .addHbarTransfer(AccountId.fromString("0.0.5069496"), new Hbar(amount))
        .setMaxTransactionFee(new Hbar(2))
        .setTransactionMemo("Payment for HederaTokenTracker services");

      const populatedTx = await signer.populateTransaction(transaction);
      const signedTx = await signer.signTransaction(populatedTx);
      const response = await signedTx.executeWithSigner(signer);
      const receipt = await response.getReceiptWithSigner(signer);

      console.log("Recibiendo respuesta de la transacción:", receipt);

      if (receipt && receipt.status === Status.Success) {
        try {
          let usosToAdd = amount === 1 ? 10 : 120;
          const newBalance = saldo + usosToAdd;

          const { error: supabaseError } = await supabase
            .from("wallets")
            .update({ saldo: newBalance })
            .eq("wallet_id", accountId);

          if (supabaseError) {
            console.error("Error actualizando el saldo en Supabase:", supabaseError.message);
            throw supabaseError;
          }

          await logSearch(accountId, `recarga_${amount}_hbar`);
          setSaldo(newBalance);

          showModalWithContent(
            "¡Transacción Exitosa! 🎉",
            `
              <div class="success-modal-content">
                <div class="transaction-details">
                  <div class="detail-item">
                    <span class="label">Monto:</span>
                    <span class="value">${amount} $HBAR</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Usos Recibidos:</span>
                    <span class="value highlight">+${usosToAdd}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Nuevo Balance:</span>
                    <span class="value">${newBalance} usos</span>
                  </div>
                </div>
                <div class="success-animation">
                  <div class="checkmark-circle"></div>
                  <div class="checkmark-stem"></div>
                  <div class="checkmark-kick"></div>
                </div>
              </div>
            `,
            "success"
          );
        } catch (dbError) {
          console.error("Error actualizando la base de datos:", dbError.message);
          showModalWithContent(
            "Error en la Actualización",
            `
              <div class="error-modal-content">
                <div class="error-icon">⚠️</div>
                <p>La transacción fue exitosa pero hubo un error actualizando el saldo.</p>
                <p>Por favor, actualiza la página para ver tu nuevo balance.</p>
                <div class="error-details">
                  <small>Error ID: ${Date.now().toString(36)}</small>
                </div>
              </div>
            `,
            "error"
          );
        }
      } else {
        throw new Error("La transacción no fue confirmada por la red.");
      }
    } catch (error) {
      console.error("Error en la transacción:", error);
      if (error.message?.includes("User rejected")) {
        showModalWithContent(
          "Transacción Cancelada",
          `
            <div class="warning-modal-content">
              <div class="warning-icon">🚫</div>
              <p>Has rechazado la transacción.</p>
              <p>No se ha realizado ningún cargo a tu wallet.</p>
            </div>
          `,
          "warning"
        );
      } else {
        showModalWithContent(
          "Error en la Transacción",
          `
            <div class="error-modal-content">
              <div class="error-icon">❌</div>
              <p>Ha ocurrido un error al procesar tu transacción.</p>
              <div class="error-details">
                <p>Detalles del error:</p>
                <code>${error.message || "Error desconocido"}</code>
                <small>Error ID: ${Date.now().toString(36)}</small>
              </div>
            </div>
          `,
          "error"
        );
      }
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const copyReferralLink = () => {
    navigator.clipboard
      .writeText(referralLink)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Error al copiar el enlace:", err);
      });
  };

  return (
    <div className="my-account-container">
      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <div className={`modal-content ${modalContent.type}`}>
            <h2 className="modal-title">
              {modalContent.icon} {modalContent.title}
            </h2>
            <div
              className="modal-message"
              dangerouslySetInnerHTML={{ __html: modalContent.message }}
            />
          </div>
        </Modal>
      )}

      <div className="promo-section">
        <img src={promoImage} alt="Promoción" className="promo-image" />
        <div className="promo-content">
          <h2>¡Potencia tu Experiencia con Nuestras Recargas Exclusivas!</h2>
          <p>
            <strong>Aumenta tu saldo</strong> con tan solo{" "}
            <strong>1 $HBAR</strong> y accede a nuestra DAPP{" "}
            <strong>hasta 10 veces</strong>. Si buscas maximizar tus beneficios,
            elige nuestro <strong>paquete premium de 10 $HBAR</strong> y
            disfruta de <strong>hasta 120 usos</strong>.
          </p>
          <div className="external-promo">
            <p>
              <strong>
                ¡No dejes pasar esta promoción exclusiva y optimiza tu
                interacción con nuestra plataforma hoy mismo!
              </strong>
            </p>
          </div>
          {/* Contenedor para centrar el promoIcon */}
          <div className="promo-icon-container">
            <img src={promoIcon} alt="Promo Icon" className="promo-icon" />
          </div>
        </div>
      </div>

      {/* Sección del sistema de referidos */}
      <div className="referral-section">
        <h3>Sistema de Referidos</h3>
        <div className="referral-link-container">
          <input
            type="text"
            value={referralLink}
            readOnly
            className="referral-link"
            onFocus={(e) => e.target.select()}
          />
          <button className="btn-copy" onClick={copyReferralLink}>
            <FaCopy /> {copied ? "Copiado!" : "Copiar"}
          </button>
        </div>
        <p className="referral-info">
          Comparte tu enlace para invitar a nuevos usuarios. Por cada referido que se registre, recibirás <strong>5 usos adicionales</strong> y ellos obtendrán <strong>3 usos extra</strong>.
        </p>
      </div>

      <div className="saldo-container">
        <h3>
          {isConnected
            ? `Tu balance actual es: ${saldo.toLocaleString()} usos`
            : "Conecta tu wallet para ver tu balance"}
        </h3>
      </div>

      {loading && (
        <div className="progress-container">
          <div
            className="progress-bar"
            style={{
              width: `${progress}%`,
              backgroundColor: "#4CAF50",
              height: "20px",
              borderRadius: "10px",
              transition: "width 0.5s ease-in-out",
            }}
          />
          <p>Procesando transacción... {progress}%</p>
        </div>
      )}

      <div className="buttons-container">
        <button
          className="btn-pay"
          onClick={() => handlePayment(1)}
          disabled={loading || !isConnected}
        >
          {loading ? "Procesando..." : "Recargar 10 usos"}
        </button>
        <button
          className="btn-pay"
          onClick={() => handlePayment(10)}
          disabled={loading || !isConnected}
        >
          {loading ? "Procesando..." : "Recargar 120 usos"}
        </button>
      </div>
    </div>
  );
}

export default MyAccount;
