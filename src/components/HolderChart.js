// src/components/HolderChart.js
import React, { useRef, useState, useEffect, useMemo } from "react";
import { Chart } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  ArcElement,
  PointElement,
  BarController,
  LineController,
  PieController,
  DoughnutController,
  Title,
  Tooltip,
  Legend
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import PropTypes from "prop-types";
import "./holderchart.css"; 
import { FaInfoCircle } from "react-icons/fa";

// Registramos todo lo necesario
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  ArcElement,
  PointElement,
  BarController,
  LineController,
  PieController,
  DoughnutController,
  Title,
  Tooltip,
  Legend,
  zoomPlugin
);

// Paleta de colores para top 10
const fixedColors = [
  "#FF6384",
  "#36A2EB",
  "#FFCE56",
  "#4BC0C0",
  "#9966FF",
  "#FF9F40",
  "#C9CBCF",
  "#00FFC8",
  "#FF6384",
  "#36A2EB",
];

// Funciones de estadística
const calculateMean = (data) => {
  if (data.length === 0) return 0;
  const sum = data.reduce((acc, val) => acc + val, 0);
  return sum / data.length;
};

const calculateMedian = (data) => {
  if (data.length === 0) return 0;
  const sorted = [...data].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
};

const calculateMode = (data) => {
  if (data.length === 0) return "No hay moda";
  const frequency = {};
  data.forEach((num) => {
    frequency[num] = (frequency[num] || 0) + 1;
  });
  let maxFreq = 0;
  let modes = [];
  for (const key in frequency) {
    if (frequency[key] > maxFreq) {
      maxFreq = frequency[key];
      modes = [Number(key)];
    } else if (frequency[key] === maxFreq) {
      modes.push(Number(key));
    }
  }
  if (modes.length === Object.keys(frequency).length) return "No hay moda";
  return modes;
};

function HolderChart({ data, decimals }) {
  const chartRef = useRef(null);

  // Tipos de gráfico permitidos: bar, line, doughnut
  const [chartType, setChartType] = useState("bar");

  // Guardamos datos originales
  const [originalChartData, setOriginalChartData] = useState({
    labels: [],
    datasets: [{ data: [] }],
  });

  // Datos actuales (por si se "borra" alguna wallet)
  const [currentChartData, setCurrentChartData] = useState({
    labels: [],
    datasets: [{ data: [] }],
  });

  const [showInfo, setShowInfo] = useState({
    mean: false,
    median: false,
    mode: false,
  });

  // Cargamos datos al iniciar
  useEffect(() => {
    if (!data || data.length === 0) {
      setOriginalChartData({ labels: [], datasets: [{ data: [] }] });
      setCurrentChartData({ labels: [], datasets: [{ data: [] }] });
      return;
    }

    // Orden descendente por balance
    const sortedData = [...data].sort((a, b) => b.balance - a.balance);
    const topTen = sortedData.slice(0, 10);

    const adjustedBalances = topTen.map(
      (item) => item.balance / Math.pow(10, decimals)
    );

    // Construimos dataset
    const newChartData = {
      labels: topTen.map((item) => item.account),
      datasets: [
        {
          label: "Balance",
          data: adjustedBalances,
          backgroundColor:
            chartType === "pie" || chartType === "doughnut"
              ? fixedColors.slice(0, topTen.length)
              : "rgba(0, 255, 200, 0.6)",
          borderColor:
            chartType === "pie" || chartType === "doughnut"
              ? fixedColors.slice(0, topTen.length)
              : "rgba(0, 255, 200, 1)",
          borderWidth: 1,
        },
      ],
    };

    setOriginalChartData(newChartData);
    setCurrentChartData(newChartData);
  }, [data, decimals, chartType]);

  // Cálculo de métricas
  const metrics = useMemo(() => {
    if (
      !currentChartData.datasets ||
      !currentChartData.datasets[0] ||
      !Array.isArray(currentChartData.datasets[0].data) ||
      currentChartData.datasets[0].data.length === 0
    ) {
      return null;
    }
    const balances = currentChartData.datasets[0].data;
    const mean = calculateMean(balances);
    const median = calculateMedian(balances);
    const mode = calculateMode(balances);
    return { mean, median, mode };
  }, [currentChartData]);

  // Opciones
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: "Top 10 Holders" },
      tooltip: {
        callbacks: {
          label: function (context) {
            const rawValue = context.raw;
            const formatted = rawValue.toLocaleString("es-ES", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            return `Balance: ${formatted}`;
          },
        },
      },
      zoom: {
        pan: {
          enabled: true,
          mode: "x",
          modifierKey: "ctrl",
        },
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: "x",
          speed: 0.1,
        },
      },
    },
    scales: {
      y: { beginAtZero: true },
      x: { beginAtZero: true },
    },
    onClick: (event, elements) => {
      if (elements && elements.length > 0) {
        const element = elements[0];
        const index = element.index;
        const label = currentChartData.labels[index];
        // Ejemplo: permitir borrar solo si es top 3
        if (index < 3) {
          if (window.confirm(`¿Deseas eliminar la wallet: ${label}?`)) {
            handleRemoveWallet(index);
          }
        } else {
          alert("Solo puedes eliminar las tres primeras wallets del gráfico.");
        }
      }
    },
  };

  // Función para cambiar tipo de gráfico
  const handleChartTypeChange = (type) => {
    setChartType(type);
  };

  // Resetea zoom y restaura datos
  const resetZoomAndRestore = () => {
    if (chartRef.current) {
      chartRef.current.resetZoom();
    }
    setCurrentChartData(originalChartData);
  };

  // Eliminar una wallet del chart
  const handleRemoveWallet = (index) => {
    setCurrentChartData((prevData) => {
      if (
        !prevData.datasets ||
        !prevData.datasets[0] ||
        !Array.isArray(prevData.datasets[0].data)
      ) {
        return prevData;
      }
      const newLabels = [...prevData.labels];
      const newValues = [...prevData.datasets[0].data];
      newLabels.splice(index, 1);
      newValues.splice(index, 1);

      let newBackgroundColor = prevData.datasets[0].backgroundColor;
      let newBorderColor = prevData.datasets[0].borderColor;

      // Si era un array (pie/doughnut)
      if (Array.isArray(newBackgroundColor)) {
        newBackgroundColor = [...newBackgroundColor];
        newBackgroundColor.splice(index, 1);
      }
      if (Array.isArray(newBorderColor)) {
        newBorderColor = [...newBorderColor];
        newBorderColor.splice(index, 1);
      }

      return {
        ...prevData,
        labels: newLabels,
        datasets: [
          {
            ...prevData.datasets[0],
            data: newValues,
            backgroundColor: newBackgroundColor,
            borderColor: newBorderColor,
          },
        ],
      };
    });
  };

  if (!data || data.length === 0) {
    return (
      <div className="chart-container">
        <h2 className="chart-title">Top 10 Holders</h2>
        <p>No hay datos para mostrar en la gráfica.</p>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h2 className="chart-title">Top 10 Holders</h2>

      {/* Estadísticas */}
      {metrics && (
        <div className="metrics-container">
          <div className="metric">
            <span>Media: {metrics.mean.toFixed(2)}</span>
            <FaInfoCircle
              className="info-icon"
              onClick={() =>
                setShowInfo((prev) => ({ ...prev, mean: !prev.mean }))
              }
            />
            {showInfo.mean && (
              <div className="popup">
                La <strong>media</strong> es el promedio de balances.
              </div>
            )}
          </div>

          <div className="metric">
            <span>Mediana: {metrics.median.toFixed(2)}</span>
            <FaInfoCircle
              className="info-icon"
              onClick={() =>
                setShowInfo((prev) => ({ ...prev, median: !prev.median }))
              }
            />
            {showInfo.median && (
              <div className="popup">
                La <strong>mediana</strong> es el valor central de los balances ordenados.
              </div>
            )}
          </div>

          <div className="metric">
            <span>
              Moda:{" "}
              {Array.isArray(metrics.mode)
                ? metrics.mode.join(", ")
                : metrics.mode}
            </span>
            <FaInfoCircle
              className="info-icon"
              onClick={() =>
                setShowInfo((prev) => ({ ...prev, mode: !prev.mode }))
              }
            />
            {showInfo.mode && (
              <div className="popup">
                La <strong>moda</strong> es el valor más repetido.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Botones para cambiar tipo de gráfico */}
      <div className="button-group">
        <button
          onClick={() => handleChartTypeChange("bar")}
          className={`chart-button ${chartType === "bar" ? "active" : ""}`}
        >
          Barras
        </button>
        <button
          onClick={() => handleChartTypeChange("line")}
          className={`chart-button ${chartType === "line" ? "active" : ""}`}
        >
          Línea
        </button>
        <button
          onClick={() => handleChartTypeChange("doughnut")}
          className={`chart-button ${chartType === "doughnut" ? "active" : ""}`}
        >
          Doughnut
        </button>

        {/* Botón para "barra horizontal": realmente sigue siendo 'bar',
            solo que con indexAxis: 'y' */}
        <button
          onClick={() => handleChartTypeChange("bar-horizontal")}
          className={`chart-button ${
            chartType === "bar-horizontal" ? "active" : ""
          }`}
        >
          Barras Horizontales
        </button>

        <button onClick={resetZoomAndRestore} className="reset-zoom-button">
          Reiniciar Zoom
        </button>
      </div>

      {/* Render del chart */}
      <Chart
        ref={chartRef}
        type={
          // Si es "bar-horizontal" lo transformamos en 'bar' real,
          // y luego en options cambiamos indexAxis: 'y'
          chartType === "bar-horizontal" ? "bar" : chartType
        }
        data={currentChartData}
        options={{
          ...chartOptions,
          indexAxis: chartType === "bar-horizontal" ? "y" : "x",
        }}
      />

      {/* Leyenda personalizada para doughnut/pie
          (si quisieras usar pie, habilítalo arriba) */}
      {(chartType === "doughnut" || chartType === "pie") && (
        <div className="custom-legend">
          {currentChartData.labels.map((label, index) => (
            <div key={index} className="legend-item">
              <span
                className="legend-color"
                style={{
                  backgroundColor: Array.isArray(
                    currentChartData.datasets[0].backgroundColor
                  )
                    ? currentChartData.datasets[0].backgroundColor[index]
                    : "rgba(0, 255, 200, 0.6)",
                }}
              />
              <span className="legend-label">{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

HolderChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      account: PropTypes.string.isRequired,
      balance: PropTypes.number.isRequired,
    })
  ).isRequired,
  decimals: PropTypes.number.isRequired,
};

export default HolderChart;
