import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
const apiPort=process.env.BURN_API_PORT===undefined?3002:Number(process.env.BURN_API_PORT);
export default defineConfig({plugins:[react()],server:{port:5173,strictPort:true,proxy:{'/api':`http://127.0.0.1:${apiPort}`}},optimizeDeps:{entries:['index.html']},build:{target:'es2022'}});
