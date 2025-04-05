const express = require('express');
const { yts, ytmp4, ytmp3 } = require("@hiudyy/ytdl");
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

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

  const saveBufferToFile = (buffer, fileName) => {
    return new Promise((resolve, reject) => {
      const tempPath = path.join('/tmp', fileName);
      fs.mkdirSync(path.dirname(tempPath), { recursive: true });
      fs.writeFile(tempPath, buffer, (err) => {
        if (err) reject(err);
        else resolve(tempPath);
      });
    });
  };

  app.get('/buscar', async (req, res) => {
    try {
      const { consulta } = req.query;
      if (!consulta) return res.status(400).json({ error: 'El parámetro consulta es requerido' });
      const resultado = await yts(consulta);
      res.json(resultado.videos[0]);
    } catch (error) {
      res.status(500).json({ error: 'Error al buscar: ' + error.message });
    }
  });

  app.get('/video', async (req, res) => {
    try {
      const { url } = req.query;
      if (!url) return res.status(400).json({ error: 'El parámetro URL es requerido' });

      const videoBuffer = await ytmp4(url);
      if (!Buffer.isBuffer(videoBuffer)) {
        return res.status(500).json({ error: 'No se recibió un buffer válido del video' });
      }

      const filePath = await saveBufferToFile(videoBuffer, 'video.mp4');
      const form = new FormData();
      form.append('reqtype', 'fileupload');
      form.append('time', '1h');
      form.append('fileToUpload', fs.createReadStream(filePath));

      const uploadResponse = await axios.post(
        'https://litterbox.catbox.moe/resources/internals/api.php',
        form,
        { headers: form.getHeaders() }
      );

      const litterboxLink = uploadResponse.data;
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error al eliminar el archivo:', err);
      });

      res.json({
        mensaje: 'Descarga de video completada y subida a Litterbox',
        enlaceLitterbox: litterboxLink
      });
    } catch (error) {
      res.status(500).json({ error: 'Error al descargar video: ' + error.message });
    }
  });

  app.get('/audio', async (req, res) => {
    try {
      const { url } = req.query;
      if (!url) return res.status(400).json({ error: 'El parámetro URL es requerido' });

      const audioBuffer = await ytmp3(url);
      if (!Buffer.isBuffer(audioBuffer)) {
        return res.status(500).json({ error: 'No se recibió un buffer válido del audio' });
      }

      const filePath = await saveBufferToFile(audioBuffer, 'audio.mp3');
      const form = new FormData();
      form.append('reqtype', 'fileupload');
      form.append('time', '1h');
      form.append('fileToUpload', fs.createReadStream(filePath));

      const uploadResponse = await axios.post(
        'https://litterbox.catbox.moe/resources/internals/api.php',
        form,
        { headers: form.getHeaders() }
      );

      const litterboxLink = uploadResponse.data;
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error al eliminar el archivo:', err);
      });

      res.json({
        mensaje: 'Descarga de audio completada y subida a Litterbox',
        enlaceLitterbox: litterboxLink
      });
    } catch (error) {
      res.status(500).json({ error: 'Error al descargar audio: ' + error.message });
    }
  });

  app.listen = () => {
    return app(req, res);
  };
  return app(req, res);
};
