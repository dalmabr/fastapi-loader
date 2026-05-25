import { useState } from 'react';

export default function IsoDecoder() {
  const [hex, setHex] = useState('');
  const [result, setResult] = useState(null);

  const handleDecode = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/iso8583/decode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hex_message: hex })
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      alert('Erro ao decodificar');
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Decodificador ISO 8583</h2>
      <textarea 
        rows={4} cols={80} 
        value={hex} onChange={e => setHex(e.target.value)} 
        placeholder="Cole a mensagem HEX aqui..." 
      />
      <br/>
      <button onClick={handleDecode} style={{ marginTop: 10 }}>Decodificar</button>
      
      {result && (
        <pre style={{ marginTop: 20, background: '#f5f5f5', padding: 10 }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}