import { Navigate } from 'react-router-dom';

/** Sinais PRO desactivados — redireciona para o banner Em breve. */
export default function ProSignalsPage() {
  return <Navigate to="/pro" replace />;
}
