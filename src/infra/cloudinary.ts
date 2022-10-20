import config from 'config';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: config.get('app.cloudinary.name'),
    api_key: config.get('app.cloudinary.apiKey'),
    api_secret: config.get('app.cloudinary.apiSecret'),
});

export default cloudinary;
