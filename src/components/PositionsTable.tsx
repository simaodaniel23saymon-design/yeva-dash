export default function PositionsTable() {
    const positions = [
      { pair: 'BTCUSDT', dir: 'Long', entry: '$67,420', capital: '$200', pnl: '+$30.44', filters: 'EMA✓ ADX 31 Vol↑ RSI 58', isProfit: true },
      { pair: 'SOLUSDT', dir: 'Long', entry: '$148.20', capital: '$150', pnl: '+$24.29', filters: 'EMA✓ ADX 28 Mom', isProfit: true },
      { pair: 'BNBUSDT', dir: 'Short', entry: '$382.50', capital: '$100', pnl: '+$14.12', filters: 'EMA✓ ADX 27 RSI 44', isProfit: true },
      { pair: 'AVAXUSDT', dir: 'Long', entry: '$32.10', capital: '$100', pnl: '+$10.45', filters: 'EMA✓ ADX 26 Vol↑', isProfit: true },
      { pair: 'DOGEUSDT', dir: 'Short', entry: '$0.134', capital: '$50', pnl: '−$2.99', filters: 'EMA✓ ADX 25 ⚠RSI51', isProfit: false },
    ];
  
    return (
      <div className="bg-velora-card border border-velora-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-velora-border flex justify-between items-center">
          <h3 className="font-semibold text-white">Posições Abertas</h3>
          <span className="text-velora-success font-bold">P&L: +$87.40</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 uppercase bg-slate-800/50">
              <tr>
                <th className="px-6 py-3">Par</th>
                <th className="px-6 py-3">Dir.</th>
                <th className="px-6 py-3">Entrada</th>
                <th className="px-6 py-3">Capital</th>
                <th className="px-6 py-3">P&L</th>
                <th className="px-6 py-3">Filtros</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-velora-border">
              {positions.map((pos, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-white">{pos.pair}</td>
                  <td className={`px-6 py-4 ${pos.dir === 'Long' ? 'text-velora-success' : 'text-velora-danger'}`}>
                    {pos.dir === 'Long' ? '▲ Long' : '▼ Short'}
                  </td>
                  <td className="px-6 py-4 text-slate-300">{pos.entry}</td>
                  <td className="px-6 py-4 text-slate-300">{pos.capital}</td>
                  <td className={`px-6 py-4 font-bold ${pos.isProfit ? 'text-velora-success' : 'text-velora-danger'}`}>{pos.pnl}</td>
                  <td className="px-6 py-4 text-xs text-slate-400 font-mono">{pos.filters}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }