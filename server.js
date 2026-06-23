const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'chaoxian2026';

// 内存中存储有效 token（服务重启后需重新登录）
const validTokens = new Set();

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// 管理员鉴权中间件
function adminAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || !validTokens.has(token)) {
    return res.status(401).json({ error: '未授权，请先登录' });
  }
  next();
}

app.use(express.json({ limit: '5mb' }));
app.use(express.static(__dirname));

function readData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch (e) {}
  return [];
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// ---- 公开接口 ----

// 登录
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: '密码错误' });
  }
  const token = generateToken();
  validTokens.add(token);
  res.json({ success: true, token });
});

// 退出登录
app.post('/api/logout', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  validTokens.delete(token);
  res.json({ success: true });
});

// 提交问卷（无需登录）
app.post('/api/submit', (req, res) => {
  const submission = req.body;
  if (!submission || !submission.unit) {
    return res.status(400).json({ error: '请填写单位名称' });
  }
  submission._id = Date.now().toString() + Math.random().toString(36).slice(2, 8);
  submission._submitTime = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });

  const data = readData();
  data.push(submission);
  writeData(data);

  res.json({ success: true, id: submission._id });
});

// ---- 需登录的后台接口 ----

// 获取所有提交
app.get('/api/submissions', adminAuth, (req, res) => {
  res.json(readData());
});

// 清空数据
app.delete('/api/submissions', adminAuth, (req, res) => {
  writeData([]);
  res.json({ success: true });
});

// 导入数据
app.post('/api/import', adminAuth, (req, res) => {
  const imported = req.body;
  if (!Array.isArray(imported)) {
    return res.status(400).json({ error: '数据格式错误，需要数组' });
  }
  const existing = readData();
  const existingIds = new Set(existing.map(d => d._id));
  let added = 0;
  imported.forEach(item => {
    if (!existingIds.has(item._id)) {
      existing.push(item);
      added++;
    }
  });
  writeData(existing);
  res.json({ success: true, added });
});

// 后台页面
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.listen(PORT, () => {
  console.log('问卷服务已启动: http://localhost:' + PORT);
  console.log('统计后台: http://localhost:' + PORT + '/admin');
  if (!process.env.ADMIN_PASSWORD) {
    console.log('⚠ 使用默认管理密码: chaoxian2026（建议设置 ADMIN_PASSWORD 环境变量）');
  }
});
