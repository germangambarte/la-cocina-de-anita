import { useState } from 'react';
import { useAuth } from '../context/auth-context';
import { useNavigate } from 'react-router-dom';

export function Login() {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const { error } = await login(usuario, password);

    if (error) {
      setErrorMsg('Credenciales incorrectas');
      setLoading(false);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-100 via-slate-50 to-slate-100 p-4">
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-2xl max-w-md w-full space-y-5 border border-amber-200">
        <div className="text-center space-y-2">
          <div className="text-6xl">🍳</div>
          <h1 className="text-2xl font-black text-slate-800">
            La Cocina de Anita
          </h1>
          <p className="text-sm font-bold text-slate-500">
            ¡Hola Anita! Ingresá para cargar tus pedidos del día.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-700 text-sm font-bold rounded-xl border border-red-200 text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">
              Usuario o Email
            </label>
            <input
              type="text"
              required
              autoCapitalize="none"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="w-full border-2 border-slate-300 rounded-xl p-3.5 text-base font-bold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-2 border-slate-300 rounded-xl p-3.5 text-base font-bold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-600 text-white font-black text-lg py-3.5 rounded-2xl hover:bg-amber-700 transition disabled:opacity-50 cursor-pointer shadow-md active:scale-95"
          >
            {loading ? 'Ingresando...' : '🔐 ENTRAR'}
          </button>
        </form>
      </div>
    </div>
  );
}
