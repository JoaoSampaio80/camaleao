import React, { useState } from 'react';
import axios from 'axios';

const DPOCadastro = () => {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cargo: '',
    data_nomeacao: '',
  });

  const [validadeNomeacao, setValidadeNomeacao] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });    
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!formData.data_nomeacao) {
      setError('Por favor, selecione a Data da Nomeação.');
      return;
    }

    try {
      // Enviamos apenas os campos necessários, o backend cuidará de 'validade_nomeacao'
      const payload = {
        nome: formData.nome,
        email: formData.email,
        telefone: formData.telefone,
        cargo: formData.cargo,
        data_nomeacao: formData.data_nomeacao,
      };

      const response = await axios.post('http://localhost:8000/api/dpos/', payload); // Ajuste a URL da sua API
      setMessage('DPO cadastrado com sucesso!');
      setFormData({
        nome: '',
        email: '',
        telefone: '',
        cargo: '',
        data_nomeacao: '',
      });
      setValidadeNomeacao('');
      console.log('DPO Cadastrado:', response.data);
    } catch (err) {
      console.error('Erro ao cadastrar DPO:', err.response ? err.response.data : err.message);
      setError('Erro ao cadastrar DPO. Verifique os dados e tente novamente.');
    }
  };

  return (
    <div style={styles.container}>
      <h2>Cadastro de DPO</h2>
      {message && <p style={styles.successMessage}>{message}</p>}
      {error && <p style={styles.errorMessage}>{error}</p>}
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formGroup}>
          <label htmlFor="nome" style={styles.label}>Nome:</label>
          <input
            type="text"
            id="nome"
            name="nome"
            value={formData.nome}
            onChange={handleChange}
            required
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label htmlFor="email" style={styles.label}>E-mail:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label htmlFor="telefone" style={styles.label}>Telefone:</label>
          <input
            type="text"
            id="telefone"
            name="telefone"
            value={formData.telefone}
            onChange={handleChange}
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label htmlFor="cargo" style={styles.label}>Cargo:</label>
          <input
            type="text"
            id="cargo"
            name="cargo"
            value={formData.cargo}
            onChange={handleChange}
            required
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label htmlFor="data_nomeacao" style={styles.label}>Data da Nomeação:</label>
          <input
            type="date"
            id="data_nomeacao"
            name="data_nomeacao"
            value={formData.data_nomeacao}
            onChange={handleChange}
            required
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Validade da Nomeação (2 anos):</label>
          <input
            type="text"
            value={validadeNomeacao}
            readOnly
            style={styles.inputReadOnly}
          />
        </div>

        <button type="submit" style={styles.button}>Cadastrar DPO</button>
      </form>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '600px',
    margin: '50px auto',
    padding: '20px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    backgroundColor: '#fff',
  },
  h2: {
    textAlign: 'center',
    color: '#333',
    marginBottom: '20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  formGroup: {
    marginBottom: '15px',
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    fontWeight: 'bold',
    color: '#555',
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    boxSizing: 'border-box',
  },
  inputReadOnly: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    boxSizing: 'border-box',
    backgroundColor: '#f0f0f0',
    color: '#777',
  },
  button: {
    backgroundColor: '#007bff',
    color: 'white',
    padding: '10px 15px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    marginTop: '10px',
  },
  buttonHover: {
    backgroundColor: '#0056b3',
  },
  successMessage: {
    color: 'green',
    textAlign: 'center',
    marginBottom: '15px',
  },
  errorMessage: {
    color: 'red',
    textAlign: 'center',
    marginBottom: '15px',
  },
};

export default DPOCadastro;