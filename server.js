const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// 确保存储文件夹存在
const nbtFolder = path.join(__dirname, 'nbts');
const picturesFolder = path.join(__dirname, 'nbts', 'pictures');
if (!fs.existsSync(nbtFolder)) fs.mkdirSync(nbtFolder, { recursive: true });
if (!fs.existsSync(picturesFolder)) fs.mkdirSync(picturesFolder, { recursive: true });

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'nbtFile') {
      cb(null, nbtFolder);
    } else if (file.fieldname === 'imageFile') {
      cb(null, picturesFolder);
    }
  },
  filename: function (req, file, cb) {
    const customName = req.body.filename;
    if (file.fieldname === 'nbtFile') {
      cb(null, customName); // 用户指定的文件名
    } else if (file.fieldname === 'imageFile') {
      const ext = path.extname(file.originalname);
      const baseName = path.basename(customName, '.nbt');
      cb(null, baseName + ext); // 图片用相同基础名
    }
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function(req, file, cb) {
    if (file.fieldname === 'nbtFile' && !file.originalname.endsWith('.nbt')) {
      cb(new Error('只允许 .nbt 文件'));
      return;
    }
    if (file.fieldname === 'imageFile' && !file.mimetype.startsWith('image/')) {
      cb(new Error('只允许图片文件'));
      return;
    }
    cb(null, true);
  }
});

// 提供静态文件访问
app.use(express.static(__dirname));
app.use('/pictures', express.static(picturesFolder));

// 检查文件名是否存在
app.get('/api/check-filename', (req, res) => {
  const filename = req.query.name;
  const filePath = path.join(nbtFolder, filename);
  res.json({ exists: fs.existsSync(filePath) });
});

// 上传文件
app.post('/upload', upload.fields([
  { name: 'nbtFile', maxCount: 1 },
  { name: 'imageFile', maxCount: 1 }
]), (req, res) => {
  res.json({ success: true, message: '上传成功' });
});

// 获取文件列表
app.get('/files', (req, res) => {
  fs.readdir(nbtFolder, (err, files) => {
    if (err) return res.status(500).json({ error: '读取文件列表失败' });
    
    const fileList = files
      .filter(file => file.endsWith('.nbt'))
      .map(file => {
        const filePath = path.join(nbtFolder, file);
        const stats = fs.statSync(filePath);
        const baseName = path.basename(file, '.nbt');
        
        // 查找对应的图片
        let imageUrl = null;
        const possibleImages = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
        for (const ext of possibleImages) {
          const imgPath = path.join(picturesFolder, baseName + ext);
          if (fs.existsSync(imgPath)) {
            imageUrl = `/pictures/${baseName}${ext}`;
            break;
          }
        }
        
        return {
          name: file,
          displayName: file,
          size: stats.size,
          uploadTime: stats.mtime,
          imageUrl: imageUrl
        };
      });
    
    res.json(fileList);
  });
});

// 下载文件
app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(nbtFolder, filename);
  
  if (fs.existsSync(filePath)) {
    res.download(filePath, filename);
  } else {
    res.status(404).json({ error: '文件不存在' });
  }
});

app.listen(PORT, () => {
  console.log(`WMCS 服务器运行在 http://localhost:${PORT}`);
});