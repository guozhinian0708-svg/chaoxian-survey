const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

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

app.get('/api/submissions', (req, res) => {
  res.json(readData());
});

app.delete('/api/submissions', (req, res) => {
  writeData([]);
  res.json({ success: true });
});

app.post('/api/import', (req, res) => {
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

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.listen(PORT, () => {
  console.log('问卷服务已启动: http://localhost:' + PORT);
  console.log('统计后台: http://localhost:' + PORT + '/admin');
});
