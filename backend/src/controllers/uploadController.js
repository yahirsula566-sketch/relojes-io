import { saveUploadedImage } from '../utils/uploads.js';
import { created, badRequest } from '../utils/response.js';

export const uploadController = {
  async uploadImage(req, res) {
    const { dataUrl } = req.body;
    if (!dataUrl) throw badRequest('Falta "dataUrl" con la imagen en base64.');
    const url = await saveUploadedImage(dataUrl);
    created(res, { url });
  },
};
