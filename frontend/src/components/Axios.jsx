import axios from 'axios'

const baseUrl = 'http://127.0.0.1:8000/'

const AxiosInstance = axios.create({
    baseURL: baseUrl,
    timeout:5000,
    headers:{
        "Content-Type": "application/json",
        accept: "application/json"
    }
})

// Adiciona um interceptor para incluir o token de autenticação em todas as requisições
AxiosInstance.interceptors.request.use(
    (config) => {
        // Pega o token de acesso do localStorage
        const accessToken = localStorage.getItem('access_token');
        
        // Se o token existir, adiciona o cabeçalho de Autorização
        if (accessToken) {
            // O formato padrão para JWT é 'Bearer' seguido de um espaço e o token
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default AxiosInstance