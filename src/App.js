// src/App.js
import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { Activity, Brain, BarChart2, CheckCircle, Database, Server, TrendingUp } from 'lucide-react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <NBAPredictor />
      </header>
    </div>
  );
}

const NBAPredictor = () => {
  const [predictions, setPredictions] = useState([]);
  const [topPick, setTopPick] = useState(null);
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [analyzing, setAnalyzing] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState(null);
  const dataLoaded = useRef(false);

  useEffect(() => {
    const checkProgress = () => {
      const timer = setTimeout(() => {
        if (progress < 100) {
          setProgress(prev => Math.min(prev + 5, 100));
          setStage(Math.floor(progress / 20));
        } else {
          setAnalyzing(false);
          clearInterval(progressInterval);
        }
      }, 500);
      return () => clearTimeout(timer);
    };
    
    const progressInterval = setInterval(checkProgress, 500);
    
    if (!dataLoaded.current) {
      dataLoaded.current = true;
      
      setTimeout(() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        const filePath = `predictions/predictions_${dateStr}.csv`;
        
        fetch(filePath)
          .then(response => {
            if (!response.ok) {
              throw new Error('Could not load predictions file');
            }
            return response.text();
          })
          .then(csvData => {
            Papa.parse(csvData, {
              header: true,
              dynamicTyping: true,
              complete: (results) => {
                if (results.data && results.data.length > 0) {
                  const validData = results.data.filter(row => 
                    row.PLAYER_NAME && row.Prop_Type && row.Line !== undefined
                  );
                  
                  // Build a list of high confidence picks that match the desired prop types
                  const desiredPropTypes = [
                    'Fantasy score', 
                    'Points assists rebounds', 
                    'Rebounds assists', 
                    'Points rebounds',
                    'Rebounds'
                  ];
                  
                  const highConfidencePicks = validData.filter(pick => {
                    const isPropTypeMatch = desiredPropTypes.includes(pick.Prop_Type);
                    const meetsConfidenceCriteria = 
                      pick.xgboost > 0.65 && 
                      pick.xgboost_rf > 0.55 && 
                      pick.catboost === 1 && 
                      pick.Adv_NN > 0.7 && 
                      pick.xgb_reg > pick.Line && 
                      pick.xgb_rf_reg > pick.Line;
                    
                    return isPropTypeMatch && meetsConfidenceCriteria;
                  });
                  
                  // Also sort the entire valid data by xgboost (if you need to use it as fallback)
                  const sortedData = validData.sort((a, b) => b.xgboost - a.xgboost);
                  
                  let selectedPick;
                  let confidenceValue;
                  
                  if (highConfidencePicks.length > 0) {
                    // Randomly select a pick from highConfidencePicks
                    const randomIndex = Math.floor(Math.random() * highConfidencePicks.length);
                    const randomPick = highConfidencePicks[randomIndex];
                    
                    selectedPick = {
                      ...randomPick,
                      Prop_Type: randomPick.Prop_Type.toUpperCase()
                    };
                    confidenceValue = Math.round(randomPick.xgboost * 100);
                  } else {
                    // Fallback: use the highest xgboost confidence pick from all valid data
                    selectedPick = {
                      ...sortedData[0],
                      Prop_Type: sortedData[0].Prop_Type.toUpperCase()
                    };
                    confidenceValue = Math.round(sortedData[0].xgboost * 100);
                  }
                  
                  setPredictions(sortedData);
                  setTopPick(selectedPick);
                  setConfidence(confidenceValue);
                  setLoadingData(false);
                } else {
                  setError("No prediction data found");
                  setLoadingData(false);
                }
              },
              error: (error) => {
                setError(`Error parsing prediction data: ${error}`);
                setLoadingData(false);
              }
            });
          })
          .catch(error => {
            console.error("Error loading prediction file:", error);
            setError(`Could not load predictions file for date ${dateStr}. Please ensure the file exists in the predictions folder.`);
            setLoadingData(false);
          });
      }, 2000);
    }
    
    return () => {
      clearInterval(progressInterval);
    };
  }, [progress]);

  const stages = [
    { name: "LOADING PLAYER DATA", icon: <Database color="#3b82f6" size={24} /> },
    { name: "FEATURE ENGINEERING", icon: <Server color="#8b5cf6" size={24} /> },
    { name: "ANALYZING MATCHUPS", icon: <BarChart2 color="#ef4444" size={24} /> },
    { name: "CALCULATING PROBABILITIES", icon: <Brain color="#f97316" size={24} /> },
    { name: "FINALIZING PREDICTION", icon: <Activity color="#10b981" size={24} /> }
  ];

  // (The rest of your style variables remain unchanged)

  const styles = {
    container: {
      backgroundColor: "#000",
      color: "#fff",
      padding: "24px",
      borderRadius: "12px",
      boxShadow: "0 4px 20px rgba(0, 0, 255, 0.2)",
      maxWidth: "500px",
      margin: "0 auto",
      fontFamily: "'Montserrat', sans-serif",
    },
    header: {
      textAlign: "center",
      marginBottom: "24px",
    },
    title: {
      fontSize: "28px",
      fontWeight: "bold",
      marginBottom: "8px",
      background: "linear-gradient(to right, #3b82f6, #8b5cf6)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
    },
    subtitle: {
      fontSize: "14px",
      color: "#9ca3af",
    },
    stageContainer: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      marginBottom: "8px",
    },
    stageName: {
      fontSize: "18px",
      fontWeight: "600",
    },
    progressBarContainer: {
      position: "relative",
      height: "16px",
      backgroundColor: "#1f2937",
      borderRadius: "8px",
      overflow: "hidden",
      marginBottom: "8px",
    },
    progressBar: {
      position: "absolute",
      top: "0",
      left: "0",
      height: "100%",
      background: "linear-gradient(to right, #3b82f6, #10b981)",
      transition: "width 0.5s ease-in-out",
    },
    progressText: {
      textAlign: "right",
      fontSize: "14px",
      color: "#9ca3af",
    },
    dataGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: "8px",
      marginTop: "16px",
    },
    dataBlock: {
      height: "32px",
      backgroundColor: "#1f2937",
      borderRadius: "4px",
      opacity: "0.7",
      overflow: "hidden",
      position: "relative",
    },
    dataBar: {
      height: "100%",
      backgroundColor: "#3b82f6",
    },
    dataInfo: {
      fontSize: "12px",
      color: "#6b7280",
      fontStyle: "italic",
      marginTop: "8px",
    },
    resultContainer: {
      textAlign: "center",
      marginTop: "24px",
    },
    checkIcon: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "8px",
      borderRadius: "50%",
      backgroundColor: "#059669",
      marginBottom: "8px",
    },
    resultTitle: {
      fontSize: "22px",
      fontWeight: "bold",
      marginBottom: "16px",
    },
    predictionCard: {
      padding: "16px",
      border: "1px solid #059669",
      borderRadius: "8px",
      backgroundColor: "#000",
      marginBottom: "16px",
    },
    playerName: {
      fontSize: "24px",
      fontWeight: "bold",
      color: "#fff",
      marginBottom: "12px",
    },
    predictionText: {
      fontSize: "30px",
      fontWeight: "bold",
      color: "#10b981",
      marginBottom: "12px",
    },
    confidenceContainer: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      marginTop: "16px",
    },
    confidenceLabel: {
      fontSize: "14px",
      color: "#9ca3af",
    },
    confidenceValue: {
      fontSize: "22px",
      fontWeight: "bold",
      color: "#10b981",
    },
    button: {
      width: "100%",
      padding: "12px 24px",
      background: "linear-gradient(to right, #3b82f6, #8b5cf6)",
      borderRadius: "8px",
      fontWeight: "bold",
      fontSize: "16px",
      cursor: "pointer",
      border: "none",
      color: "white",
    },
    modelGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "8px",
      marginTop: "8px",
      marginBottom: "16px",
    },
    allModelsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: "8px",
      marginTop: "16px",
      marginBottom: "16px",
    },
    modelBox: {
      padding: "8px",
      backgroundColor: "#1f2937",
      borderRadius: "4px",
      textAlign: "center",
    },
    modelName: {
      fontSize: "12px",
      color: "#9ca3af",
      marginBottom: "4px",
    },
    modelValue: {
      fontSize: "16px",
      fontWeight: "bold",
      color: "#10b981",
    },
    modelValueReg: {
      fontSize: "16px",
      fontWeight: "bold",
      color: "#60a5fa",
    },
    additionalPicks: {
      marginTop: "16px",
      backgroundColor: "#111827",
      padding: "12px",
      borderRadius: "8px",
    },
    pickTitle: {
      fontSize: "14px",
      color: "#9ca3af",
      marginBottom: "8px",
    },
    pickList: {
      listStyle: "none",
      padding: "0",
      margin: "0",
    },
    pickItem: {
      padding: "8px",
      borderBottom: "1px solid #1f2937",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    pickName: {
      fontSize: "14px",
      fontWeight: "500",
    },
    pickConfidence: {
      fontSize: "14px",
      fontWeight: "bold",
      color: "#10b981",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>PROPSTRADAMUS</h1>
        <p style={styles.subtitle}>POWERED BY ADVANCED MACHINE LEARNING</p>
      </div>

      {analyzing ? (
        <div>
          <div style={styles.stageContainer}>
            {stage < stages.length && stages[stage].icon}
            <h2 style={styles.stageName}>{stage < stages.length ? stages[stage].name : "PROCESSING"}</h2>
          </div>

          <div style={styles.progressBarContainer}>
            <div 
              style={{
                ...styles.progressBar, 
                width: `${progress}%`
              }}
            />
          </div>
          
          <div style={styles.progressText}>
            {progress}% COMPLETE
          </div>

          <div style={styles.dataGrid}>
            {[...Array(16)].map((_, i) => (
              <div 
                key={i} 
                style={styles.dataBlock}
              >
                <div 
                  style={{
                    ...styles.dataBar,
                    width: `${Math.random() * 100}%`,
                    opacity: Math.random() * 0.5 + 0.5
                  }}
                />
              </div>
            ))}
          </div>

          <div style={styles.dataInfo}>
            PROCESSING MULTI-MODEL PREDICTION SYSTEM
          </div>
        </div>
      ) : (
        <div style={styles.resultContainer}>
          {loadingData ? (
            <p>Loading prediction data...</p>
          ) : error ? (
            <p>{error}</p>
          ) : topPick ? (
            <>
              <div style={styles.checkIcon}>
                <CheckCircle style={{color: "white"}} size={32} />
              </div>
              
              <h2 style={styles.resultTitle}>HIGH CONFIDENCE PICK IDENTIFIED</h2>
              
              <div style={styles.predictionCard}>
                <div style={{fontSize: "14px", color: "#9ca3af", marginBottom: "4px"}}>PLAYER</div>
                <div style={styles.playerName}>{topPick.PLAYER_NAME}</div>
                
                <div style={{fontSize: "14px", color: "#9ca3af", marginBottom: "4px"}}>PREDICTION</div>
                <div style={styles.predictionText}>
                  OVER {topPick.Line} {topPick.Prop_Type}
                </div>
                
                <div style={styles.allModelsGrid}>
                  <div style={styles.modelBox}>
                    <div style={styles.modelName}>XGBOOST</div>
                    <div style={styles.modelValue}>{(topPick.xgboost * 100).toFixed(1)}%</div>
                  </div>
                  <div style={styles.modelBox}>
                    <div style={styles.modelName}>XGBOOST RF</div>
                    <div style={styles.modelValue}>{(topPick.xgboost_rf * 100).toFixed(1)}%</div>
                  </div>
                  <div style={styles.modelBox}>
                    <div style={styles.modelName}>CATBOOST</div>
                    <div style={styles.modelValue}>{(topPick.catboost * 100).toFixed(1)}%</div>
                  </div>
                  <div style={styles.modelBox}>
                    <div style={styles.modelName}>ADVANCED NN</div>
                    <div style={styles.modelValue}>{(topPick.Adv_NN * 100).toFixed(1)}%</div>
                  </div>
                  <div style={styles.modelBox}>
                    <div style={styles.modelName}>XGB REG</div>
                    <div style={styles.modelValueReg}>{topPick.xgb_reg.toFixed(2)}</div>
                  </div>
                  <div style={styles.modelBox}>
                    <div style={styles.modelName}>XGB RF REG</div>
                    <div style={styles.modelValueReg}>{topPick.xgb_rf_reg.toFixed(2)}</div>
                  </div>
                </div>
                
                <div style={styles.confidenceContainer}>
                  <div style={styles.confidenceLabel}>AI CONFIDENCE:</div>
                  <div style={styles.confidenceValue}>{confidence}%</div>
                </div>
              </div>
              
              <div style={styles.additionalPicks}>
                <div style={styles.pickTitle}>ADDITIONAL HIGH CONFIDENCE PICKS</div>
                <ul style={styles.pickList}>
                  {predictions.slice(1, 4).map((pick, index) => (
                    <li key={index} style={styles.pickItem}>
                      <span style={styles.pickName}>
                        {pick.PLAYER_NAME} {pick.Prop_Type.toUpperCase()} O{pick.Line}
                      </span>
                      <span style={styles.pickConfidence}>
                        {(pick.xgboost * 100).toFixed(1)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <button style={styles.button}>
                GET ALL PREMIUM PICKS
              </button>
            </>
          ) : (
            <p>No predictions available</p>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
