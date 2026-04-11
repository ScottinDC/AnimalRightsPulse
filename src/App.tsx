import { Dashboard } from "./pages/Dashboard";

function App() {
  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage: `url("${import.meta.env.BASE_URL}background.jpg")`,
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
