// api/server.js
const express = require('express');
const { yts, ytmp4, ytmp3 } = require("@hiudyy/ytdl");
const axios = require('axios');
const FormData = require('form-data');

module.exports = async (req, res) => {
  const app = express();
  app.use(express.json());

  app.get('/', (req, res) => {
    res.send(`
        <h1>API de Descarga de YouTube</h1>
        <p>Bienvenido a la API simplificada de descarga de YouTube</p>
        <h2>Endpoints Disponibles:</h2>
        <h3>1. Buscar en YouTube (/buscar)</h3>
        <pre>GET /buscar?consulta={término-de-búsqueda}</pre>
        <h3>2. Descargar Video de YouTube (/video)</h3>
        <pre>GET /video?url={url-de-youtube}</pre>
        <h3>3. Descargar Audio de YouTube (/audio)</h3>
        <pre>GET /audio?url={url-de-youtube}</pre>
    `);
  });

  // Subir buffer directamente a Litterbox sin guardar archivo
  const uploadToLitterbox = async (buffer, fileName) => {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('time', '1h');
    form.append('fileToUpload', buffer, { filename: fileName });

    console.log('Subiendo a Litterbox...');
    const uploadResponse = await axios.post(
      'https://litterbox.catbox.moe/resources/internals/api.php',
      form,
      { headers: form.getHeaders(), timeout: 8000 } // Timeout de 8 segundos
    );
    console.log('Subida completada, respuesta:', uploadResponse.data);
    return uploadResponse.data;
  };

  app.get('/buscar', async (req, res) => {
    try {
      const { consulta } = req.query;
      if (!consulta) return res.status(400).json({ error: 'El parámetro consulta es requerido' });
      console.log('Buscando:', consulta);
      const resultado = await yts(consulta);
      console.log('Resultado de búsqueda:', resultado);
      res.json(resultado.videos[0]);
    } catch (error) {
      console.error('Error en /buscar:', error.message);
      res.status(500).json({ error: 'Error al buscar: ' + error.message });
    }
  });

  app.get('/video', async (req, res) => {
    try {
      const { url } = req.query;
      if (!url) return res.status(400).json({ error: 'El parámetro URL es requerido' });
      console.log('Descargando video desde:', url);

      const videoBuffer = await ytmp4(url);
      if (!Buffer.isBuffer(videoBuffer)) {
        console.error('Resultado no es un buffer:', videoBuffer);
        return res.status(500).json({ error: 'No se recibió un buffer válido del video' });
      }
      console.log('Video descargado, tamaño del buffer:', videoBuffer.length);

      const litterboxLink = await uploadToLitterbox(videoBuffer, 'video.mp4');

      res.json({
        mensaje: 'Descarga de video completada y subida a Litterbox',
        enlaceLitterbox: litterboxLink
      });
    } catch (error) {
      console.error('Error en /video:', error.message);
      res.status(500).json({ error: 'Error al descargar video: ' + error.message });
    }
  });

  app.get('/audio', async (req, res) => {
    try {
      const { url } = req.query;
      if (!url) return res.status(400).json({ error: 'El parámetro URL es requerido' });
      console.log('Descargando audio desde:', url);

      const audioBuffer = await ytmp3(url);
      if (!Buffer.isBuffer(audioBuffer)) {
        console.error('Resultado no es un buffer:', audioBuffer);
        return res.status(500).json({ error: 'No se recibió un buffer válido del audio' });
      }
      console.log('Audio descargado, tamaño del buffer:', audioBuffer.length);

      const litterboxLink = await uploadToLitterbox(audioBuffer, 'audio.mp3');

      res.json({
        mensaje: 'Descarga de audio completada y subida a Litterbox',
        enlaceLitterbox: litterboxLink
      });
    } catch (error) {
      console.error('Error en /audio:', error.message);
      res.status(500).json({ error: 'Error al descargar audio: ' + error.message });
    }
  });

  app.listen = () => {
    return app(req, res);
  };
  return app(req, res);
};
