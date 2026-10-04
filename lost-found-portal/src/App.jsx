import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ItemForm from "./pages/ItemForm";
import ItemDetails from "./pages/ItemDetails";
import AdminPanel from "./pages/AdminPanel";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/items/new" element={<ItemForm />} />
          <Route path="/items/:id" element={<ItemDetails />} />
          <Route path="/items/:id/edit" element={<ItemForm />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
