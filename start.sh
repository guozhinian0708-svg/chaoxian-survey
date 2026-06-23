#!/bin/bash
# =============================================
#  宁波市公路超限运输管理调查问卷 - 一键启动
#  本地服务 + 内网穿透（localtunnel）
# =============================================

cd "$(dirname "$0")"

NODE="/Users/guozhinian/.workbuddy/binaries/node/versions/22.12.0/bin/node"

echo "========================================="
echo "  宁波市公路超限运输管理调查问卷系统"
echo "========================================="
echo ""

# 检查依赖
if [ ! -d "node_modules/localtunnel" ]; then
  echo "⏳ 首次运行，正在安装依赖..."
  "$NODE" "$(dirname "$NODE")/../lib/node_modules/npm/bin/npm-cli.js" install localtunnel --save 2>/dev/null || npm install localtunnel --save 2>/dev/null
  if [ $? -ne 0 ]; then
    echo "⚠️  自动安装失败，请手动运行: npm install"
    exit 1
  fi
fi

# 启动 Express 后端
echo "▶ 启动问卷服务（端口 3000）..."
"$NODE" server.js &
SERVER_PID=$!
sleep 2

# 检查服务是否启动成功
if ! curl -s -m 3 http://localhost:3000 > /dev/null 2>&1; then
  echo "❌ 服务启动失败"
  kill $SERVER_PID 2>/dev/null
  exit 1
fi

# 启动 localtunnel
echo "▶ 启动内网穿透..."
echo ""
LT_CMD="$NODE node_modules/.bin/lt"
if [ ! -f "node_modules/.bin/lt" ]; then
  LT_CMD="$NODE node_modules/localtunnel/bin/lt.js"
fi

$LT_CMD --port 3000 --print-requests 2>&1 | while IFS= read -r line; do
  echo "$line"
  if echo "$line" | grep -qE "https://.*\.loca\.lt"; then
    TUNNEL_URL=$(echo "$line" | grep -oE 'https://[^ ]*\.loca\.lt')
    echo ""
    echo "========================================="
    echo "  ✅ 公网链接已生成！"
    echo ""
    echo "  📝 填表链接:"
    echo "     ${TUNNEL_URL}"
    echo ""
    echo "  📊 统计后台:"
    echo "     ${TUNNEL_URL}/admin"
    echo ""
    echo "  💡 首次访问需点击页面上的"
    echo "     'Click to Continue' 验证按钮"
    echo "========================================="
    echo ""
    echo "按 Ctrl+C 停止所有服务"
  fi
done

# 清理
kill $SERVER_PID 2>/dev/null
echo "服务已停止"
