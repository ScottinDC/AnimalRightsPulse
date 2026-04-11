import { Dashboard } from "./pages/Dashboard";
import bgImage from "./assets/background.jpg";

function App() {
  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage: `url("${bgImage}")`,
          backgroundRepeat: "repeat",
          backgroundSize: "480px auto",
          opacity: 0.2,
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", zIndex: 1 }}>
        <Dashboard />
      </div>
    </>
  );
}

export default App;
