import multer from 'multer';

export const upload = multer({ 
    storage: multer.diskStorage({}),
    limits: { fileSize: 1024 * 1024 },
    fileFilter(_, file, cb)  {
        if (file.mimetype.match(/png||jpeg||jpg$i/)) return cb(null, true)
        cb(null, false);
    },
})