import { Dashboard } from "./pages/Dashboard";

function App() {
  const base = import.meta.env.BASE_URL;

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.14]"
        style={{
          backgroundImage: `url("${base}background.jpg")`,
          backgroundRepeat: "repeat",
          backgroundPosition: "-42px top",
          backgroundSize: "500px auto"
        }}
      />
      <div className="relative z-10">
        <Dashboard />
      </div>
    </>
  );
}

export default App;
